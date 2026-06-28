import urllib.request
import urllib.error
import json

BASE_URL = "http://localhost:8000/api/v1"
ADMIN_EMAIL = "admin@qvhealth.com"
ADMIN_PASS = "Admin@123456"

def make_request(url, method="GET", headers=None, data=None):
    if headers is None:
        headers = {}
    if data is not None:
        data = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'
        
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            body = response.read().decode('utf-8')
            try:
                parsed = json.loads(body)
            except:
                parsed = body
            return response.status, parsed
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            parsed = json.loads(body)
        except:
            parsed = body
        return e.code, parsed
    except Exception as e:
        return "ERROR", str(e)

def test_api():
    results = []

    def log_result(name, url, method, status, expected_status, response_body):
        passed = status == expected_status
        if isinstance(expected_status, list):
            passed = status in expected_status

        results.append({
            "name": name,
            "url": url,
            "method": method,
            "status": status,
            "passed": passed,
            "response": response_body
        })
        print(f"[{'PASS' if passed else 'FAIL'}] {method} {url} - Status: {status}")

    # 1. Login
    url = f"{BASE_URL}/auth/login"
    status, body = make_request(url, "POST", data={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    log_result("Login", url, "POST", status, 200, body)
    
    if status != 200:
        print("Failed to login, aborting further tests.")
        return results
        
    token = body.get("access_token")
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get Users
    url = f"{BASE_URL}/users"
    status, body = make_request(url, "GET", headers=headers)
    log_result("List Users", url, "GET", status, 200, body)
    
    users = body.get("items", []) if status == 200 else []
    student_id = None
    if users:
        for u in users:
            if u.get("role") == "STUDENT":
                student_id = u["id"]
                break

    # 3. Create User
    new_user_data = {
        "email": "teststudent22@example.com",
        "username": "teststudent22",
        "password": "Password123!",
        "first_name": "Test",
        "last_name": "Student",
        "role": "STUDENT"
    }
    url = f"{BASE_URL}/users"
    status, body = make_request(url, "POST", headers=headers, data=new_user_data)
    log_result("Create User", url, "POST", status, [200, 201], body)
    
    if status in [200, 201]:
        created_user_id = body.get("id")
        
        # 4. Get User By ID
        url = f"{BASE_URL}/users/{created_user_id}"
        status, body = make_request(url, "GET", headers=headers)
        log_result("Get User by ID", url, "GET", status, 200, body)

        # 5. Update User
        url = f"{BASE_URL}/users/{created_user_id}"
        status, body = make_request(url, "PATCH", headers=headers, data={"first_name": "UpdatedName"})
        log_result("Update User", url, "PATCH", status, 200, body)

        # 6. Delete User
        url = f"{BASE_URL}/users/{created_user_id}"
        status, body = make_request(url, "DELETE", headers=headers)
        log_result("Delete User", url, "DELETE", status, [200, 204], body)
        
    if student_id:
        # 7. Get Complaints
        url = f"{BASE_URL}/users/{student_id}/complaints"
        status, body = make_request(url, "GET", headers=headers)
        log_result("Get User Complaints", url, "GET", status, 200, body)

        # 8. Get Teacher History
        url = f"{BASE_URL}/users/{student_id}/teacher-history"
        status, body = make_request(url, "GET", headers=headers)
        log_result("Get Teacher History", url, "GET", status, 200, body)

        # 9. Get Session Scores
        url = f"{BASE_URL}/users/{student_id}/session-scores"
        status, body = make_request(url, "GET", headers=headers)
        log_result("Get Session Scores", url, "GET", status, 200, body)
    else:
        print("Warning: No student found to test sub-table endpoints. Ensure seed_history.py was run.")

    return results

if __name__ == "__main__":
    results = test_api()
    
    md_output = "# API Test Results\n\n"
    
    passed_count = sum(1 for r in results if r["passed"])
    total_count = len(results)
    
    md_output += f"**Summary:** {passed_count}/{total_count} tests passed.\n\n"
    
    for r in results:
        status_icon = "✅ PASS" if r["passed"] else "❌ FAIL"
        md_output += f"### {status_icon}: {r['name']}\n"
        md_output += f"- **Request:** `{r['method']} {r['url']}`\n"
        md_output += f"- **Status Code:** {r['status']}\n"
        
        md_output += "#### Response:\n```json\n"
        if isinstance(r['response'], (dict, list)):
            md_output += json.dumps(r['response'], indent=2) + "\n"
        else:
            md_output += str(r['response']) + "\n"
        md_output += "```\n\n"
        
    # Write to artifacts directory
    artifact_path = "/Users/muhammedrefaat/.gemini/antigravity-ide/brain/ccceb920-c158-4202-9085-081ec4201331/api_test_results.md"
    with open(artifact_path, "w") as f:
        f.write(md_output)
    
    print(f"\nResults written to {artifact_path}")
