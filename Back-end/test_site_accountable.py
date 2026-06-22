import asyncio
import httpx

async def test():
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000/api/v1") as client:
        # Login
        login = await client.post("/auth/login", json={"email": "admin@solar-erp.io", "password": "Admin@1234!"})
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get a site
        sites_res = await client.get("/sites", headers=headers)
        site_id = sites_res.json()["items"][0]["id"]
        
        # Create a user
        res = await client.post("/users", json={
            "username": "test_accountable2",
            "email": "test2@example.com",
            "password": "Password@123",
            "role": "SITE_ACCOUNTABLE",
            "site_id": site_id
        }, headers=headers)
        print("Create User:", res.status_code)
        
        # Verify site update
        site_res = await client.get(f"/sites/{site_id}", headers=headers)
        print("Site Accountable ID:", site_res.json()["accountable_user_id"])
        print("Created User ID:", res.json()["id"])
        
asyncio.run(test())
