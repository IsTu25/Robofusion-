from typing import Dict, Any
from datetime import datetime

# In-memory cache for ultra-fast polling by ESP32 devices
zone_actuation_cache: Dict[int, Dict[str, Any]] = {}

def update_zone_actuation(zone_id: int, buzzer: bool, relay: bool, led_red: bool, led_yellow: bool, led_green: bool, override_active: bool = False):
    """Updates the in-memory cache for a zone."""
    zone_actuation_cache[zone_id] = {
        "buzzer": buzzer,
        "relay": relay,
        "led_red": led_red,
        "led_yellow": led_yellow,
        "led_green": led_green,
        "override_active": override_active,
        "timestamp": datetime.utcnow().isoformat()
    }

def get_zone_actuation(zone_id: int) -> Dict[str, Any]:
    """Retrieves the actuation state from cache. Defaults to safe if not found."""
    return zone_actuation_cache.get(zone_id, {
        "buzzer": False, 
        "relay": False,
        "led_red": False,
        "led_yellow": False,
        "led_green": True,  # Default safe implies green LED is on
        "override_active": False,
        "timestamp": datetime.utcnow().isoformat()
    })
