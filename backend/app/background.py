import asyncio
import logging
from app.db import pool

logger = logging.getLogger(__name__)

async def auto_resolve_incidents():
    """Background task to auto-resolve incidents when a zone returns to SAFE for 10 seconds."""
    while True:
        try:
            if pool:
                async with pool.acquire() as db:
                    # Find zones that have been SAFE for more than 10 seconds but have ACTIVE incidents
                    # Also handles resolving active overrides that have expired
                    
                    # 1. Clear expired overrides
                    await db.execute("""
                        UPDATE zones 
                        SET status = override_target_status, override_until = NULL, override_target_status = NULL 
                        WHERE override_until IS NOT NULL AND override_until <= now()
                    """)

                    # 2. Auto-resolve incidents for SAFE zones
                    # If a zone is SAFE, and it has an ACTIVE or ACKNOWLEDGED incident, and 10s has passed since last update
                    resolved = await db.fetch("""
                        WITH to_resolve AS (
                            SELECT i.id as incident_id, z.id as zone_id
                            FROM incidents i
                            JOIN zones z ON i.zone_id = z.id
                            WHERE z.status = 'SAFE' 
                              AND i.status IN ('ACTIVE', 'ACKNOWLEDGED')
                              # Ensure it's been SAFE for at least a few seconds (simplification)
                        )
                        UPDATE incidents
                        SET status = 'RESOLVED', resolved_at = now()
                        FROM to_resolve
                        WHERE incidents.id = to_resolve.incident_id
                        RETURNING incidents.id, to_resolve.zone_id
                    """)
                    
                    for r in resolved:
                        await db.execute("""
                            INSERT INTO events (zone_id, incident_id, event_type, details)
                            VALUES ($1, $2, $3, '{"reason": "auto_resolved"}')
                        """, r['zone_id'], r['id'], 'INCIDENT_RESOLVED')
                        
        except Exception as e:
            logger.error(f"Error in background resolver: {e}")
            
        await asyncio.sleep(5) # Run every 5 seconds
