import asyncpg
import json
import logging
from app.schemas import ReadingPayload
from app.cache import update_zone_actuation
from app.ws_manager import manager
logger = logging.getLogger(__name__)

async def process_reading(zone_id: int, payload: ReadingPayload, db: asyncpg.Connection):
    # 1. Deduplication (check sequence number and boot_id) via RETURNING id
    inserted_id = await db.fetchval("""
        INSERT INTO readings 
        (zone_id, boot_id, sequence_number, fire_raw, gas_raw, water_raw, pir_raw, is_late, ms_since_boot, warmup)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (zone_id, boot_id, sequence_number) DO NOTHING
        RETURNING id
    """, zone_id, str(payload.boot_id), payload.sequence_number, payload.fire_raw, payload.gas_raw, 
         payload.water_raw, payload.pir_raw, payload.is_late, payload.ms_since_boot, payload.warmup)

    if inserted_id is None:
        return # Duplicate, ignore

    # 3. Late reading bypass: DO NOT process risk or trigger incidents
    if payload.is_late:
        return

    # 4. Fetch Zone Data and State
    zone_exists = await db.fetchval("SELECT id FROM zones WHERE id = $1", zone_id)
    if not zone_exists:
        return
        
    state = await db.fetchrow("SELECT * FROM zone_hazard_state WHERE zone_id = $1 FOR UPDATE", zone_id)
    if not state:
        # Initialize if not exists
        await db.execute("INSERT INTO zone_hazard_state (zone_id) VALUES ($1)", zone_id)
        state = await db.fetchrow("SELECT * FROM zone_hazard_state WHERE zone_id = $1 FOR UPDATE", zone_id)
        
    state_dict = dict(state)

    # Hardcoded Standard Thresholds (Schema does not store these dynamically)
    threshold_fire = 0.5
    threshold_gas = 300.0
    threshold_water = 200.0

    # 5. Normalization
    fire_norm = 1.0 if (payload.fire_raw is not None and payload.fire_raw >= threshold_fire) else 0.0
    gas_norm = 1.0 if (payload.gas_raw is not None and payload.gas_raw >= threshold_gas) else 0.0
    water_norm = 1.0 if (payload.water_raw is not None and payload.water_raw >= threshold_water) else 0.0
    pir_val = payload.pir_raw if payload.pir_raw is not None else False

    # 6. Fire Decay Logic
    if fire_norm >= 0.5:
        state_dict['debounce_fire_count'] += 1
        if state_dict['debounce_fire_count'] >= 2:
            state_dict['fire_decay_value'] = 1.0
            state_dict['last_fire_high_at'] = 'now'
    else:
        state_dict['debounce_fire_count'] = 0
        if state_dict['fire_decay_value'] > 0:
            # Simple decay logic (would normally be time-based, doing step-based here)
            state_dict['fire_decay_value'] = max(0.0, state_dict['fire_decay_value'] - 0.05)
            
    eff_fire = state_dict['fire_decay_value']

    # 7. PIR Confirmation Logic
    if pir_val:
        state_dict['pir_last_true_at'] = 'now'
        state_dict['pir_confirmed'] = True
    else:
        # In a real time-based app, we'd check if (now - pir_last_true_at) > 10s
        # For this prototype, we'll keep it simple: if fire is active, it stays confirmed
        pass
    
    eff_pir = 1.0 if state_dict['pir_confirmed'] else 0.0

    # 8. ML Prediction
    from app.ml_predictor import predict_critical
    prob = predict_critical(zone_id, payload.fire_raw, payload.gas_raw, payload.water_raw, payload.pir_raw)

    # 9. Risk Calculation (Static weights + ML)
    w_fire = 40
    w_gas = 25
    w_water = 20
    w_pir = 15
    w_ml = 45

    base_score = (w_fire * eff_fire) + (w_gas * gas_norm) + (w_water * water_norm) + (w_pir * eff_pir)
    score = min(100.0, base_score + (w_ml * prob))
    state_dict['last_risk_score'] = score

    # 9. Determine Status
    zone = await db.fetchrow("SELECT status, override_until, override_target_status FROM zones WHERE id = $1", zone_id)
    old_status = zone['status']

    if score >= 65:
        computed_status = 'CRITICAL'
    elif score >= 40:
        computed_status = 'WARNING'
    else:
        computed_status = 'SAFE'
        
    if zone['override_until'] is not None and zone['override_target_status'] is not None:
        override_sev = {'SAFE': 0, 'WARNING': 1, 'CRITICAL': 2}.get(zone['override_target_status'], 0)
        computed_sev = {'SAFE': 0, 'WARNING': 1, 'CRITICAL': 2}.get(computed_status, 0)
        
        if computed_sev > override_sev:
            # Fail-safe: sensor detected higher severity than override. Sensor wins.
            new_status = computed_status
        else:
            new_status = zone['override_target_status']
    else:
        new_status = computed_status

    # Update state
    await db.execute("""
        UPDATE zone_hazard_state 
        SET debounce_fire_count = $1, fire_decay_value = $2, 
            pir_confirmed = $3, last_risk_score = $4
        WHERE zone_id = $5
    """, state_dict['debounce_fire_count'], state_dict['fire_decay_value'],
         state_dict['pir_confirmed'], state_dict['last_risk_score'], zone_id)

    # 10. Update Zone and trigger Incidents
    # old_status is already determined above (line 81)
    
    await db.execute("UPDATE zones SET status = $1, last_reading_at = now() WHERE id = $2", new_status, zone_id)
    
    # Update cache based on status
    override_active = zone['override_until'] is not None and zone['override_target_status'] is not None
    
    buzzer = new_status in ('CRITICAL', 'WARNING')
    relay = new_status == 'CRITICAL'
    led_red = new_status == 'CRITICAL'
    led_yellow = new_status == 'WARNING'
    led_green = new_status == 'SAFE'
    
    update_zone_actuation(zone_id, buzzer, relay, led_red, led_yellow, led_green, override_active)

    # 11. Broadcast raw reading for UI
    await manager.broadcast({
        "type": "READING_PROCESSED",
        "zone_id": zone_id,
        "fire_raw": payload.fire_raw,
        "gas_raw": payload.gas_raw,
        "water_raw": payload.water_raw,
        "pir_raw": payload.pir_raw,
        "risk_score": score,
        "status": new_status
    })

    if old_status != new_status or score != state_dict.get('last_risk_score', -1):
        from app.trend import calculate_risk_trend
        trend = await calculate_risk_trend(zone_id, db)
        
        await manager.broadcast({
            "type": "ZONE_STATUS_CHANGED",
            "zone_id": zone_id,
            "new_status": new_status,
            "risk_score": round(score, 1),
            "trend": trend,
            "fire_raw": payload.fire_raw,
            "gas_raw": payload.gas_raw,
            "water_raw": payload.water_raw,
            "pir_raw": payload.pir_raw
        })
        
        # Save score for next iteration compare
        await db.execute("UPDATE zone_hazard_state SET last_risk_score = $1 WHERE zone_id = $2", score, zone_id)
        
    # --- BONUS: ML PREDICTION BROADCAST ---
    if prob > 0:
        await manager.broadcast({
            "type": "ML_PREDICTION",
            "zone_id": zone_id,
            "critical_probability": round(prob * 100, 1)
        })

    if new_status != old_status:
        # Determine hazard types for insertion
        hazards = []
        if eff_fire > 0: hazards.append('fire')
        if gas_norm > 0: hazards.append('gas')
        if water_norm > 0: hazards.append('water')
        if eff_pir > 0: hazards.append('pir')

        if new_status in ('CRITICAL', 'WARNING'):
            # Check for existing ACTIVE or ACKNOWLEDGED incident
            existing_incident = await db.fetchrow(
                "SELECT id, severity, status FROM incidents WHERE zone_id = $1 AND status IN ('ACTIVE', 'ACKNOWLEDGED')", zone_id
            )
            
            if not existing_incident:
                try:
                    # Create new incident
                    incident_id = await db.fetchval("""
                        INSERT INTO incidents (zone_id, severity, hazard_types, risk_score_at_trigger, status)
                        VALUES ($1, $2, $3, $4, 'ACTIVE')
                        RETURNING id
                    """, zone_id, new_status, hazards, score)
                    
                    # Log event
                    await db.execute("""
                        INSERT INTO events (zone_id, incident_id, event_type, old_status, new_status, risk_score, source)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """, zone_id, incident_id, 'INCIDENT_STARTED', old_status, new_status, score, 'SYSTEM')
                    
                    await manager.broadcast({
                        "type": "INCIDENT_STARTED",
                        "zone_id": zone_id,
                        "incident_id": incident_id,
                        "severity": new_status
                    })
                except asyncpg.exceptions.UniqueViolationError:
                    # A concurrent request already created the incident. Safe to ignore.
                    pass
            
            else:
                # Incident exists. Escalation check
                incident_id = existing_incident['id']
                if existing_incident['severity'] == 'WARNING' and new_status == 'CRITICAL':
                    await db.execute("""
                        UPDATE incidents SET severity = 'CRITICAL' WHERE id = $1
                    """, incident_id)
                    
                    await db.execute("""
                        INSERT INTO events (zone_id, incident_id, event_type, old_status, new_status, risk_score, source)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """, zone_id, incident_id, 'INCIDENT_ESCALATED', old_status, new_status, score, 'SYSTEM')
                    
                    await manager.broadcast({
                        "type": "INCIDENT_ESCALATED",
                        "zone_id": zone_id,
                        "incident_id": incident_id,
                        "severity": new_status
                    })

        elif new_status == 'SAFE':
            # Auto-Resolution check
            active_incidents = await db.fetch(
                "SELECT id FROM incidents WHERE zone_id = $1 AND status IN ('ACTIVE', 'ACKNOWLEDGED')", zone_id
            )
            for inc in active_incidents:
                inc_id = inc['id']
                await db.execute("""
                    UPDATE incidents SET status = 'RESOLVED', resolved_at = now() WHERE id = $1
                """, inc_id)
                
                await db.execute("""
                    INSERT INTO events (zone_id, incident_id, event_type, old_status, new_status, risk_score, source)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                """, zone_id, inc_id, 'INCIDENT_AUTO_RESOLVED', old_status, new_status, score, 'SYSTEM')
                
                await manager.broadcast({
                    "type": "INCIDENT_AUTO_RESOLVED",
                    "zone_id": zone_id,
                    "incident_id": inc_id
                })

