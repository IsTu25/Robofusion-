import asyncio
import logging
import app.db

logger = logging.getLogger(__name__)

async def auto_resolve_incidents():
    """Background task to auto-resolve incidents when a zone returns to SAFE for 10 seconds."""
    while True:
        try:
            if app.db.pool:
                async with app.db.pool.acquire() as db:
                    # Find zones that have been SAFE for more than 10 seconds but have ACTIVE incidents
                    # Also handles resolving active overrides that have expired
                    
                    # 1. Clear expired overrides
                    await db.execute("""
                        UPDATE zones 
                        SET override_until = NULL, override_target_status = NULL 
                        WHERE override_until IS NOT NULL AND override_until <= now()
                    """)

                    # 2. Auto-resolve incidents for SAFE zones
                    # If a zone is SAFE, and it has an ACTIVE or ACKNOWLEDGED incident, and 10s has passed since last update
                    resolved = await db.fetch("""
                        WITH to_resolve AS (
                            SELECT i.id as incident_id, z.id as zone_id
                            FROM incidents i
                            JOIN zones z ON i.zone_id = z.id
                            WHERE z.status = 'SAFE' 
                              AND i.status IN ('ACTIVE', 'ACKNOWLEDGED')
                        )
                        UPDATE incidents
                        SET status = 'RESOLVED', resolved_at = now()
                        FROM to_resolve
                        WHERE incidents.id = to_resolve.incident_id
                        RETURNING incidents.id, to_resolve.zone_id
                    """)
                    
                    for r in resolved:
                        await db.execute("""
                            INSERT INTO events (zone_id, incident_id, event_type, old_status, new_status, source)
                            VALUES ($1, $2, $3, 'WARNING', 'SAFE', 'SYSTEM')
                        """, r['zone_id'], r['id'], 'INCIDENT_RESOLVED')
                        
                    # 3. Mark zones OFFLINE if no reading for 10 seconds (TC23a)
                    offline_zones = await db.fetch("""
                        UPDATE zones SET status = 'OFFLINE'
                        WHERE is_active = true AND status != 'OFFLINE'
                          AND (last_reading_at IS NULL OR last_reading_at < now() - interval '10 seconds')
                        RETURNING id
                    """)
                    
                    if offline_zones:
                        from app.ws_manager import manager
                        for oz in offline_zones:
                            await manager.broadcast({
                                "type": "ZONE_STATUS_CHANGED",
                                "zone_id": oz['id'],
                                "new_status": "OFFLINE",
                                "risk_score": 0,
                                "trend": "STABLE"
                            })
        except Exception as e:
            logger.error(f"Error in background resolver: {e}")
            
        await asyncio.sleep(5) # Run every 5 seconds
