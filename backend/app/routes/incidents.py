from fastapi import APIRouter, Depends, HTTPException, status
import asyncpg
from app.db import get_db
from app.dependencies import get_current_user, require_admin, UserContext
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

@router.get("/")
async def list_incidents(
    status_filter: Optional[str] = None, 
    limit: int = 20, 
    offset: int = 0, 
    user: UserContext = Depends(get_current_user), 
    db: asyncpg.Connection = Depends(get_db)
):
    query = """
        SELECT i.*, z.name as zone_name 
        FROM incidents i
        JOIN zones z ON i.zone_id = z.id
    """
    args = []
    
    if status_filter:
        query += " WHERE i.status = $1"
        args.append(status_filter)
        
    # Get total count for pagination
    count_query = "SELECT COUNT(*) FROM incidents"
    if status_filter:
        count_query += " WHERE status = $1"
        total = await db.fetchval(count_query, status_filter)
    else:
        total = await db.fetchval(count_query)
        
    query += f" ORDER BY i.triggered_at DESC LIMIT ${len(args)+1} OFFSET ${len(args)+2}"
    args.extend([limit, offset])
    
    incidents = await db.fetch(query, *args)
    return {
        "incidents": [dict(i) for i in incidents],
        "total_count": total,
        "has_more": (offset + limit) < total
    }

@router.post("/{incident_id}/acknowledge")
async def acknowledge_incident(incident_id: int, user: UserContext = Depends(get_current_user), db: asyncpg.Connection = Depends(get_db)):
    # Check if incident is active
    incident = await db.fetchrow("SELECT status FROM incidents WHERE id = $1", incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if incident['status'] != 'ACTIVE':
        raise HTTPException(status_code=400, detail="Only ACTIVE incidents can be acknowledged")

    await db.execute("UPDATE incidents SET status = 'ACKNOWLEDGED' WHERE id = $1", incident_id)
    
    await db.execute("""
        INSERT INTO acknowledgments (incident_id, user_id)
        VALUES ($1, $2)
    """, incident_id, user.id)

    # Fetch zone_id and status for the events insert and broadcast
    inc_data = await db.fetchrow("SELECT zone_id, status FROM incidents WHERE id = $1", incident_id)

    await db.execute("""
        INSERT INTO events (zone_id, incident_id, event_type, old_status, new_status, user_id, source)
        VALUES ($1, $2, 'INCIDENT_ACKNOWLEDGED', $3, 'ACKNOWLEDGED', $4, 'STAFF')
    """, inc_data['zone_id'], incident_id, inc_data['status'], user.id)
    
    from app.ws_manager import manager
    await manager.broadcast({
        "type": "INCIDENT_ACKNOWLEDGED",
        "zone_id": inc_data['zone_id'],
        "incident_id": incident_id,
        "user": user.username
    })

    return {"status": "success", "message": "Incident acknowledged"}
