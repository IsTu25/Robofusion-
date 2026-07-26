import re
import asyncpg
import logging

logger = logging.getLogger(__name__)

async def parse_and_validate_nl(text: str, db: asyncpg.Connection):
    """
    Simulates an NLP/LLM extraction pipeline with a deterministic validation gate.
    Extracts: {zone_id, hazard_type, severity}
    """
    text_lower = text.lower()
    
    zone_id = None
    
    # Extract Zone ID (e.g., "zone 1", "zone 12")
    zone_match = re.search(r'zone\s*(\d+)', text_lower)
    if zone_match:
        zone_id = int(zone_match.group(1))
    else:
        # Try natural names
        if 'iot lab' in text_lower or 'iot' in text_lower:
            zone_id = 1
        elif 'server room' in text_lower or 'server' in text_lower:
            zone_id = 2
        elif 'data science' in text_lower or 'data lab' in text_lower:
            zone_id = 3
            
    if not zone_id:
        return {"success": False, "error": "Could not identify a specific Zone in the report. Please use 'Zone X' or the lab name (e.g. 'Server Room')."}

    
    # Verify zone exists
    zone = await db.fetchrow("SELECT id, name FROM zones WHERE id = $1 AND is_active = true", zone_id)
    if not zone:
        return {"success": False, "error": f"Validation Gate Failed: Zone {zone_id} does not exist or is inactive."}
        
    # Extract Hazard Type
    hazard_type = None
    if 'fire' in text_lower or 'smoke' in text_lower or 'burning' in text_lower:
        hazard_type = 'fire'
    elif 'gas' in text_lower or 'smell' in text_lower or 'leak' in text_lower:
        hazard_type = 'gas'
    elif 'water' in text_lower or 'flood' in text_lower or 'puddle' in text_lower:
        hazard_type = 'water'
    elif 'motion' in text_lower or 'person' in text_lower or 'intruder' in text_lower:
        hazard_type = 'pir'
        
    if not hazard_type:
        return {"success": False, "error": "Could not identify a specific hazard type (fire, gas, water, motion) in the report."}
        
    # Extract Severity (e.g., "severity 80", "99")
    severity_match = re.search(r'(?:severity|level)\s*(\d+)', text_lower)
    severity = 100 # default to max if they just say "fire"
    if severity_match:
        severity = int(severity_match.group(1))
        
    if not (0 <= severity <= 1000):
        return {"success": False, "error": "Validation Gate Failed: Severity must be between 0 and 1000."}
        
    return {
        "success": True,
        "data": {
            "zone_id": zone_id,
            "zone_name": zone['name'],
            "hazard_type": hazard_type,
            "severity": severity
        }
    }
