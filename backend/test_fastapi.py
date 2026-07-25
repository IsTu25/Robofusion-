import asyncio
from httpx import AsyncClient
from app.main import app

async def test():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/api/zones/1/commands", headers={"X-Zone-API-Key": "test"})
        print(response.status_code, response.text)

asyncio.run(test())
