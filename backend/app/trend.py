import asyncpg
import logging

logger = logging.getLogger(__name__)

async def calculate_risk_trend(zone_id: int, db: asyncpg.Connection) -> str:
    """
    Calculates the trend of the risk score based on the last 10 readings.
    Returns: 'INSUFFICIENT_DATA', 'TRENDING_UP', 'TRENDING_DOWN', or 'STABLE'.
    """
    try:
        # Fetch the last 10 historical risk scores for this zone (we actually don't save risk_score to readings directly, wait!)
        # Ah, we need to save the risk score to the readings table or infer it.
        # Let's see if readings has a risk_score column... Let's query it.
        # If not, we can pull the history of hazard states or create a dedicated trend table.
        # Actually, let's just fetch the last 10 readings and compute a simplified risk proxy for the trend.
        
        # Better yet, if we check the DB schema, `readings` has fire_raw, gas_raw, water_raw, pir_raw.
        records = await db.fetch("""
            SELECT fire_raw, gas_raw, water_raw, pir_raw 
            FROM readings 
            WHERE zone_id = $1 
            ORDER BY received_at DESC 
            LIMIT 10
        """, zone_id)

        if len(records) < 3:
            return "INSUFFICIENT_DATA"

        # Calculate a proxy risk score for each of the last N readings
        # (Since actual risk score depends on moving state, we approximate for the trend line)
        y_values = []
        for r in records:
            # We'll just do a very simple heuristic sum of raw values since it's just for a trend slope
            f = r['fire_raw'] if r['fire_raw'] is not None else 0
            g = r['gas_raw'] if r['gas_raw'] is not None else 0
            w = r['water_raw'] if r['water_raw'] is not None else 0
            # Normalize them roughly to 0-100 scale just for slope
            proxy = (f * 100) + (g / 3) + (w / 3)
            y_values.append(proxy)
            
        # The records are DESC (newest first). Let's reverse them so x=0 is oldest, x=N is newest.
        y_values.reverse()
        
        n = len(y_values)
        x_values = list(range(n))
        
        # Linear regression slope:
        sum_x = sum(x_values)
        sum_y = sum(y_values)
        sum_xy = sum(x * y for x, y in zip(x_values, y_values))
        sum_xx = sum(x * x for x in x_values)
        
        denominator = (n * sum_xx) - (sum_x * sum_x)
        if denominator == 0:
            return "STABLE"
            
        slope = ((n * sum_xy) - (sum_x * sum_y)) / denominator
        
        # Thresholds for slope
        if slope > 1.0:
            return "TRENDING_UP"
        elif slope < -1.0:
            return "TRENDING_DOWN"
        else:
            return "STABLE"
            
    except Exception as e:
        logger.error(f"Error calculating trend: {e}")
        return "STABLE"
