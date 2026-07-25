import asyncio
import aiohttp
import asyncpg
import time
import uuid
import statistics

DATABASE_URL = "postgresql://robofusion:robofusion_pass@localhost:5433/robofusion"
API_URL = "http://localhost:8000/api/zones"

async def setup_phantom_zones(conn):
    print("Setting up 20 phantom zones...")
    api_keys = []
    for i in range(100, 120):
        key = f"key_phantom_{i}"
        name = f"Phantom Zone {i}"
        
        zone = await conn.fetchrow("SELECT id FROM zones WHERE name = $1", name)
        if not zone:
            zone_id = await conn.fetchval("""
                INSERT INTO zones (name, api_key, is_active)
                VALUES ($1, $2, true)
                RETURNING id
            """, name, key)
        else:
            zone_id = zone['id']
            
        api_keys.append((zone_id, key))
    return api_keys

async def simulate_zone(session, zone_id, api_key, stats):
    boot_id = str(uuid.uuid4())
    headers = {"X-Zone-API-Key": api_key, "Content-Type": "application/json"}
    start_time = time.time()
    
    for seq in range(1, 61):  # 60 seconds
        ms_since_boot = int((time.time() - start_time) * 1000)
        
        payload = {
            "readings": [{
                "boot_id": boot_id,
                "sequence_number": seq,
                "fire_raw": 0.0,
                "gas_raw": 100.0,
                "water_raw": 100.0,
                "pir_raw": False,
                "ms_since_boot": ms_since_boot,
                "is_late": False,
                "warmup": False
            }]
        }
        
        req_start = time.time()
        try:
            async with session.post(f"{API_URL}/{zone_id}/readings/", json=payload, headers=headers) as resp:
                req_end = time.time()
                latency_ms = (req_end - req_start) * 1000
                
                stats['latencies'].append(latency_ms)
                if resp.status not in (200, 201):
                    stats['errors'] += 1
        except Exception as e:
            stats['errors'] += 1
            
        elapsed = time.time() - start_time
        target = seq * 1.0
        sleep_time = target - elapsed
        if sleep_time > 0:
            await asyncio.sleep(sleep_time)

async def main():
    conn = await asyncpg.connect(DATABASE_URL)
    zones = await setup_phantom_zones(conn)
    await conn.close()
    
    stats = {'latencies': [], 'errors': 0}
    print(f"Starting load test with {len(zones)} concurrent zones for 60 seconds...")
    
    async with aiohttp.ClientSession() as session:
        tasks = []
        for zone_id, api_key in zones:
            tasks.append(simulate_zone(session, zone_id, api_key, stats))
            
        await asyncio.gather(*tasks)
        
    print("\n--- Load Test Results ---")
    latencies = stats['latencies']
    if not latencies:
        print("No requests completed successfully.")
        return
        
    avg_latency = statistics.mean(latencies)
    p99_latency = statistics.quantiles(latencies, n=100)[98] if len(latencies) >= 100 else max(latencies)
    max_latency = max(latencies)
    
    print(f"Total Requests: {len(latencies)}")
    print(f"Errors: {stats['errors']}")
    print(f"Avg Latency: {avg_latency:.2f}ms")
    print(f"p99 Latency: {p99_latency:.2f}ms")
    print(f"Max Latency: {max_latency:.2f}ms")
    
    if p99_latency < 500:
        print("✅ SLA MET (p99 < 500ms)")
    else:
        print("❌ SLA FAILED (p99 >= 500ms)")

if __name__ == "__main__":
    asyncio.run(main())
