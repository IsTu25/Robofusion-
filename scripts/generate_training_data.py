import csv
import random
import os

OUTPUT_FILE = "data/ml_dataset.csv"

def generate_window(will_be_critical: bool):
    """
    Generates a 5-reading sliding window.
    If will_be_critical is True, the readings show a trend moving towards critical (e.g., gas rising).
    If False, it remains mostly safe.
    """
    window = []
    
    gas_base = 100.0
    water_base = 100.0
    
    if will_be_critical:
        # Start elevated and rise
        gas_base = random.uniform(200, 300)
        gas_step = random.uniform(10, 30)
    else:
        gas_step = random.uniform(-2, 2)
        
    for i in range(5):
        fire = 0.0
        gas = gas_base + (i * gas_step) + random.uniform(-5, 5)
        water = water_base + random.uniform(-5, 5)
        pir = 1 if will_be_critical and random.random() > 0.5 else 0
        
        window.extend([fire, gas, water, pir])
        
    return window

def main():
    print("Generating ML training dataset (10,000 sequences)...")
    
    # 20 features (5 readings * 4 sensors) + 1 label
    headers = []
    for i in range(1, 6):
        headers.extend([f"r{i}_fire", f"r{i}_gas", f"r{i}_water", f"r{i}_pir"])
    headers.append("label")
    
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    
    with open(OUTPUT_FILE, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        
        for _ in range(10000):
            # 20% chance of critical
            is_critical = random.random() < 0.2
            
            features = generate_window(is_critical)
            row = features + [1 if is_critical else 0]
            
            writer.writerow(row)
            
    print(f"Dataset generated successfully at {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
