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
    
    # 2. Translate to Zone Override
    # Since the physical ESP32 sends real hardware data every 1 second, injecting a fake reading 
    # would be instantly overwritten by the hardware's next "safe" reading before the UI can even update!
    # To make the NL Report persist, we use the manual override system to lock the zone state.
    
    target_status = 'CRITICAL' if data['severity'] >= 65 else ('WARNING' if data['severity'] >= 40 else 'SAFE')
    
    if target_status != 'SAFE':
        await db.execute("""
            UPDATE zones 
            SET override_until = now() + interval '5 minutes',
                override_target_status = $1
            WHERE id = $2
        """, target_status, data['zone_id'])
        
        # We process a dummy payload just to trigger the risk engine to broadcast the new override state immediately
        payload = ReadingPayload(
            boot_id=uuid.uuid4(),
            sequence_number=1,
            fire_raw=0.0, gas_raw=0.0, water_raw=0.0, pir_raw=False,
            ms_since_boot=0
        )
        await process_reading(data['zone_id'], payload, db)
    
    return {
        "success": True,
        "message": f"Report parsed successfully. Action: Artificially triggered {data['hazard_type']} severity {data['severity']} in {data['zone_name']}.",
        "parsed_data": data
    }
