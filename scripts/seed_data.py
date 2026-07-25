import asyncio
import asyncpg
import random
import uuid
from datetime import datetime, timedelta

DATABASE_URL = "postgresql://robofusion:robofusion_pass@localhost:5433/robofusion"

async def seed_data():
    print("Connecting to database...")
    conn = await asyncpg.connect(DATABASE_URL)
    
    # Check zones
    zones = await conn.fetch("SELECT id FROM zones WHERE is_active = true")
    if not zones:
        print("No active zones found. Please ensure init.sql and seed.sql are run.")
        await conn.close()
        return
        
    zone_ids = [z['id'] for z in zones]
    
    print("Generating 15,000 historical readings...")
    readings = []
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=30)
    
    for i in range(15000):
        # random time
        random_seconds = random.randint(0, int((end_time - start_time).total_seconds()))
        ts = start_time + timedelta(seconds=random_seconds)
        zid = random.choice(zone_ids)
        
        r = (
            zid,
            str(uuid.uuid4()),
            i,
            1.0 if random.random() > 0.99 else 0.0,
            100.0 + random.uniform(-10, 50),
            100.0 + random.uniform(-10, 50),
            random.choice([True, False]),
            False,
            random.randint(100000, 900000),
            ts
        )
        readings.append(r)
        
    # Bulk insert readings
    await conn.executemany("""
        INSERT INTO readings 
        (zone_id, boot_id, sequence_number, fire_raw, gas_raw, water_raw, pir_raw, is_late, ms_since_boot, received_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    """, readings)
    
    print("Generating 200 historical incidents...")
    incidents = []
    for i in range(200):
        random_seconds = random.randint(0, int((end_time - start_time).total_seconds()))
        triggered_at = start_time + timedelta(seconds=random_seconds)
        
        # To avoid the unique constraint "one_active_incident_per_zone", make all historical ones RESOLVED
        resolved_at = triggered_at + timedelta(minutes=random.randint(5, 120))
        status = 'RESOLVED'
        
        severity = random.choice(['WARNING', 'CRITICAL'])
        
        inc = (
            random.choice(zone_ids),
            severity,
            status,
            ['fire', 'gas'] if random.random() > 0.5 else ['water'],
            random.uniform(30, 100),
            triggered_at,
            resolved_at
        )
        incidents.append(inc)
        
    await conn.executemany("""
        INSERT INTO incidents
        (zone_id, severity, status, hazard_types, risk_score_at_trigger, triggered_at, resolved_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    """, incidents)
    
    print("Seed complete.")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
