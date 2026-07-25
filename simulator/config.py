ZONE_CONFIGS = {
    1: {"name": "IoT Lab", "api_key": "key_iot_123"},
    2: {"name": "Server Room", "api_key": "key_server_456"},
    3: {"name": "Data Science Lab", "api_key": "key_data_789"}
}

# Add the 20 Phantom Zones dynamically
for i in range(4, 24):
    num = i + 96
    ZONE_CONFIGS[i] = {"name": f"Phantom Zone {num}", "api_key": f"key_phantom_{num}"}
