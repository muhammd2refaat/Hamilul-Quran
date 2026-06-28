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

# Get users
_, users_data = make_request(f"{BASE_URL}/users", "GET", headers=headers)
users = users_data["items"]
teacher = next((u for u in users if u["role"] == "TEACHER"), None)
student = next((u for u in users if u["role"] == "STUDENT"), None)

if teacher and student:
    data = {
        "teacher_id": teacher["id"],
        "student_id": student["id"],
        "sessions_per_week": 2,
        "duration": 45,
        "schedule": [{"day": "mon", "time": "08:00 AM"}, {"day": "wed", "time": "09:00 AM"}]
    }
    status, body = make_request(f"{BASE_URL}/allocations", "POST", headers=headers, data=data)
    print("POST /allocations", status, body)
    
    status, body = make_request(f"{BASE_URL}/allocations", "GET", headers=headers)
    print("GET /allocations", status, body)
