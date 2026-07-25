import asyncio
import aiohttp
import uuid
import random
import time
import argparse

API_URL = "http://localhost:8000/api/zones"

async def simulate_device(zone_id: int, api_key: str, hazard_type: str = None):
    boot_id = str(uuid.uuid4())
    seq = 0
    start_time = time.time()
    
    async with aiohttp.ClientSession() as session:
        headers = {"X-Zone-API-Key": api_key, "Content-Type": "application/json"}
        
        while True:
            seq += 1
            ms_since_boot = int((time.time() - start_time) * 1000)
            
            # Base safe values
            fire = 0.0
            gas = 100.0 + random.uniform(-10, 10)
            water = 100.0 + random.uniform(-10, 10)
            pir = False

            # Inject hazards based on arguments
            if hazard_type == 'fire':
                fire = 1.0 if random.random() > 0.1 else 0.0
                pir = True
            elif hazard_type == 'gas':
                gas = 350.0 + random.uniform(0, 50)
            elif hazard_type == 'water':
                water = 350.0 + random.uniform(0, 50)

            payload = {
                "readings": [{
                    "boot_id": boot_id,
                    "sequence_number": seq,
                    "fire_raw": fire,
                    "gas_raw": gas,
                    "water_raw": water,
                    "pir_raw": pir,
                    "ms_since_boot": ms_since_boot,
                    "is_late": False,
                    "warmup": False
                }]
            }
            
            # Send readings (fire and forget conceptually, though we await here)
            try:
                async with session.post(f"{API_URL}/{zone_id}/readings", json=payload, headers=headers) as resp:
                    if resp.status != 200:
                        print(f"[{zone_id}] Error posting reading: {resp.status}")
            except Exception as e:
                print(f"[{zone_id}] Connection error: {e}")

            # Poll commands every 200ms
            if seq % 2 == 0:  # If reading is 500ms, and we want commands fast, we'll just poll occasionally in this simple simulator
                try:
                    async with session.get(f"{API_URL}/{zone_id}/commands", headers=headers) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            if data.get('buzzer'):
                                print(f"[{zone_id}] BUZZER ON | RELAY {'ON' if data.get('relay') else 'OFF'}")
                except Exception as e:
                    pass
                    
            await asyncio.sleep(0.5)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--zone", type=int, required=True)
    parser.add_argument("--key", type=str, required=True)
    parser.add_argument("--hazard", type=str, choices=['fire', 'gas', 'water', 'none'], default='none')
    args = parser.parse_args()
    
    print(f"Starting simulator for Zone {args.zone} with hazard={args.hazard}")
    asyncio.run(simulate_device(args.zone, args.key, args.hazard))
