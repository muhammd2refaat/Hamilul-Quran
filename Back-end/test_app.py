import httpx
import asyncio

async def test_orders():
    # Login
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000/api/v1") as client:
        login_res = await client.post("/auth/login", json={"email": "admin@solar-erp.io", "password": "Admin@1234!"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Trigger FK error
        create_res = await client.post("/orders", json={"description": "Test order", "site_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"}, headers=headers)
        print("Create Order FK Error:")
        print("Status:", create_res.status_code)
        print("Response:", create_res.text)

asyncio.run(test_orders())
