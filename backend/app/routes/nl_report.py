from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import asyncpg
import uuid

from app.db import get_db
from app.dependencies import require_admin, UserContext
from app.nl_validator import parse_and_validate_nl
from app.risk_engine import process_reading
from app.schemas import ReadingPayload

router = APIRouter()

class NLReportRequest(BaseModel):
    text: str

@router.post("")
async def submit_nl_report(request: NLReportRequest, admin: UserContext = Depends(require_admin), db: asyncpg.Connection = Depends(get_db)):
    # 1. Parse and Validate
    result = await parse_and_validate_nl(request.text, db)
    
    if not result['success']:
        return {"success": False, "error": result['error']}
        
    data = result['data']
    
    # 2. Translate to artificial sensor payload
    # We will simulate a reading that exactly triggers the severity they asked for.
    # To do this cleanly, we'll zero out everything else and set the requested hazard to the severity level.
    # We use high values to ensure it hits CRITICAL if they said severity 100
    
    # We should query the threshold first, but for simplicity, 
    # we'll just inject the raw value. If they say severity 100, we'll inject 500 to guarantee a trip.
    # Actually, we can just map severity 0-100 to raw 0-500.
    
    raw_val = (data['severity'] / 100.0) * 500.0
    
    payload = ReadingPayload(
        boot_id=uuid.uuid4(),
        sequence_number=1, # Mock sequence
        fire_raw=raw_val if data['hazard_type'] == 'fire' else 0.0,
        gas_raw=raw_val if data['hazard_type'] == 'gas' else 0.0,
        water_raw=raw_val if data['hazard_type'] == 'water' else 0.0,
        pir_raw=True if data['hazard_type'] == 'pir' else False,
        ms_since_boot=0
    )
    
    # 3. Process it synchronously to trigger the risk engine
    await process_reading(data['zone_id'], payload, db)
    
    return {
        "success": True,
        "message": f"Report parsed successfully. Action: Artificially triggered {data['hazard_type']} severity {data['severity']} in {data['zone_name']}.",
        "parsed_data": data
    }
