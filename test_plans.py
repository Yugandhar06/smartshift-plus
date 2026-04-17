import requests
import datetime

API_URL = "http://localhost:8000/api"

print("--- Testing Plan Flow ---")

try:
    print("1. Creating/Logging in user '9999999999'...")
    user_data = {
        "phone": "9999999999",
        "name": "Test Raider",
        "home_zone_id": 1,
        "role": "rider"
    }
    
    res = requests.post(f"{API_URL}/auth/signup", json=user_data)
    if res.status_code != 200:
        res = requests.post(f"{API_URL}/auth/login?phone={user_data['phone']}")
    
    user_id = res.json()["id"]
    print(f"   Success! User ID: {user_id}")
    
    print("\n2. Getting current plan (Expected 404 if new user)...")
    res = requests.get(f"{API_URL}/users/{user_id}/plans/current")
    print(f"   Status: {res.status_code}, Response: {res.text}")
    
    print("\n3. Creating 'light' plan...")
    plan_data = {
        "plan_type": "light",
        "weekly_premium": 99.0,
        "coverage_ratio": 0.60,
        "start_date": datetime.datetime.utcnow().strftime("%Y-%m-%d"),
        "user_id": user_id
    }
    res = requests.post(f"{API_URL}/users/{user_id}/plans", json=plan_data)
    if res.status_code == 200:
        print(f"   Success! Plan ID: {res.json()['id']}, Premium: {res.json()['weekly_premium']}")
    else:
        print(f"   Failed: {res.status_code} - {res.text}")
        
    print("\n4. Getting current plan (Expected 200 with 'light')...")
    res = requests.get(f"{API_URL}/users/{user_id}/plans/current")
    if res.status_code == 200:
        print(f"   Success! Active Plan: {res.json()['plan_type']}, Status: {res.json()['status']}")
    else:
        print(f"   Error: {res.status_code} - {res.text}")
        
    print("\n5. Trying to UPGRADE to 'pro' on Friday (Expected 400 - Blocked)...")
    plan_data["plan_type"] = "pro"
    res = requests.post(f"{API_URL}/users/{user_id}/plans", json=plan_data)
    print(f"   Status: {res.status_code}, Response: {res.text}")
    
except Exception as e:
    print(f"Test failed with error: {e}")

print("\n--- Test Complete ---")    
