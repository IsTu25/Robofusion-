import asyncpg
from app.config import settings

# Global connection pool
pool: asyncpg.Pool = None

async def init_db_pool():
    global pool
    # We use a pool size of 100 to support the 46+ concurrent requests from the simulator
    pool = await asyncpg.create_pool(
        settings.DATABASE_URL,
        min_size=10,
        max_size=100
    )

async def close_db_pool():
    global pool
    if pool:
        await pool.close()

# Dependency to get a DB connection from the pool
async def get_db():
    async with pool.acquire() as connection:
        yield connection
