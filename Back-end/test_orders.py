import httpx
import asyncio

async def test_orders():
    # Login
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000/api/v1") as client:
        login_res = await client.post("/auth/login", json={"email": "admin@solar-erp.io", "password": "Admin@1234!"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        sites = (await client.get("/sites", headers=headers)).json()["items"]
        site_id = sites[0]["id"]
        
        # 2. Get All Orders
        get_all = await client.get("/orders", headers=headers)
        print("Get All Orders:", get_all.status_code, get_all.text)

asyncio.run(test_orders())
