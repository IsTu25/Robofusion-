import asyncio
import aiohttp
import uuid
import time
import argparse
import random
from config import ZONE_CONFIGS

API_BASE = "http://localhost:8000/api/zones"

class ZoneSimulator:
    def __init__(self, zone_id: int, api_key: str, name: str, chaos: bool = False):
        self.zone_id = zone_id
        self.api_key = api_key
        self.name = name
        self.chaos = chaos
        self.boot_id = str(uuid.uuid4())
        self.seq = 0
        self.start_time = time.time()
        self.offline_queue = []
        self.chaos_state = 0  # 0: SAFE, 1: WARNING, 2: CRITICAL, 3: SAFE
        self.last_chaos_shift = time.time()
        self.headers = {"X-Zone-API-Key": self.api_key, "Content-Type": "application/json"}

    def get_readings(self, ms_since_boot: int):
        # 30s Gas Warmup
        warmup = ms_since_boot < 30000

        fire = 0.0
        gas = 100.0 + random.uniform(-5, 5)
        water = 100.0 + random.uniform(-5, 5)
        pir = False

        if self.chaos:
            # Shift state every 3 seconds
            if time.time() - self.last_chaos_shift > 3.0:
                self.chaos_state = (self.chaos_state + 1) % 4
                self.last_chaos_shift = time.time()
                print(f"[{self.name}] Chaos state shifted to {self.chaos_state}")

            if self.chaos_state == 1: # WARNING
                gas = 350.0 + random.uniform(0, 50)
            elif self.chaos_state == 2: # CRITICAL
                fire = 1.0 if random.random() > 0.1 else 0.0
                gas = 350.0 + random.uniform(0, 50)
                pir = True

        return {
            "boot_id": self.boot_id,
            "sequence_number": self.seq,
            "fire_raw": fire,
            "gas_raw": None if warmup else gas,
            "water_raw": water,
            "pir_raw": pir,
            "ms_since_boot": ms_since_boot,
            "is_late": False,
            "warmup": warmup
        }

    async def run(self):
        print(f"Starting simulator for {self.name} (ID: {self.zone_id}) | Chaos: {self.chaos}")
        async with aiohttp.ClientSession() as session:
            while True:
                self.seq += 1
                ms_since_boot = int((time.time() - self.start_time) * 1000)
                reading = self.get_readings(ms_since_boot)

                # Add to queue
                self.offline_queue.append(reading)

                try:
                    # Attempt to send all queued readings (Batch Resync)
                    # If queue has older items, they should be marked is_late=True, except the current one
                    batch_payload = {"readings": []}
                    for r in self.offline_queue:
                        if r["sequence_number"] != self.seq:
                            r["is_late"] = True
                        batch_payload["readings"].append(r)

                    async with session.post(f"{API_BASE}/{self.zone_id}/readings/", json=batch_payload, headers=self.headers, timeout=2) as resp:
                        if resp.status in (200, 201):
                            # Success! Clear queue
                            if len(self.offline_queue) > 1:
                                print(f"[{self.name}] Batch resync successful. Sent {len(self.offline_queue)} readings.")
                            self.offline_queue = []
                        else:
                            print(f"[{self.name}] Error posting reading: {resp.status} - {await resp.text()}")

                except Exception as e:
                    print(f"[{self.name}] Connection error: backend unreachable. Queue size: {len(self.offline_queue)}")

                # Poll commands
                try:
                    async with session.get(f"{API_BASE}/{self.zone_id}/commands/", headers=self.headers, timeout=1) as resp:
                        if resp.status == 200:
                            cmds = await resp.json()
                            actuations = []
                            if cmds.get('buzzer'): actuations.append("Buzzer ON")
                            if cmds.get('relay'): actuations.append("Relay ON")
                            if actuations:
                                print(f"[ACTUATION] {self.name}: {' | '.join(actuations)}")
                except Exception:
                    pass

                await asyncio.sleep(1.0)

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--zone", type=str, default="all", help="Zone ID to simulate, or 'all'")
    parser.add_argument("--chaos", action="store_true", help="Enable chaos mode")
    args = parser.parse_args()

    tasks = []
    
    if args.zone.lower() == "all":
        # Simulate all available zones
        for zid in ZONE_CONFIGS.keys():
            config = ZONE_CONFIGS.get(zid)
            if config:
                sim = ZoneSimulator(zid, config["api_key"], config["name"], args.chaos)
                tasks.append(sim.run())
    else:
        zid = int(args.zone)
        config = ZONE_CONFIGS.get(zid)
        if config:
            sim = ZoneSimulator(zid, config["api_key"], config["name"], args.chaos)
            tasks.append(sim.run())
        else:
            print(f"Zone {zid} not found in config.")

    if tasks:
        await asyncio.gather(*tasks)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nSimulator stopped.")
