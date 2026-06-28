import urllib.request
import urllib.error
import json

BASE_URL = "http://localhost:8000/api/v1"

def make_request(url, method="GET", headers=None, data=None):
    if headers is None: headers = {}
    if data is not None:
        data = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))

status, body = make_request(f"{BASE_URL}/auth/login", "POST", data={"email": "admin@qvhealth.com", "password": "Admin@123456"})
token = body["access_token"]
headers = {"Authorization": f"Bearer {token}"}

status, body = make_request(f"{BASE_URL}/complaints", "GET", headers=headers)
print("GET /complaints", status, len(body), "items")
if body:
    first_id = body[0]["id"]
    print("Updating complaint", first_id)
    s2, b2 = make_request(f"{BASE_URL}/complaints/{first_id}/status", "PATCH", headers=headers, data={"status": "in_review", "admin_note": "Working on it"})
    print("PATCH /status", s2, b2.get("status"), b2.get("admin_note"))
