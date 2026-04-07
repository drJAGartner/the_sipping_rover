#!/usr/bin/env python3
"""Test full onboarding workflow: register, rate 3 cafes, complete onboarding."""
import sys
import requests

BASE = "http://localhost:8000"
EMAIL = "testrover@example.com"
PASSWORD = "testpassword123"
NAME = "Test Rover"


def step(msg): print(f"\n>>> {msg}")
def ok(msg): print(f"    ✓ {msg}")
def fail(msg, detail=None):
    print(f"    ✗ {msg}")
    if detail: print(f"      {detail}")
    sys.exit(1)


# 1. Login (or register)
step("Login")
r = requests.post(f"{BASE}/auth/token", data={"username": EMAIL, "password": PASSWORD})
if r.status_code != 200:
    fail(f"Login failed ({r.status_code})", r.text)
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
ok(f"Logged in as {EMAIL}")

# 2. Reset state
step("Reset onboarding state")
r = requests.patch(f"{BASE}/users/me", json={"onboarding_complete": False}, headers=headers)
if r.status_code != 200:
    fail(f"Reset failed ({r.status_code})", r.text)
ok("onboarding_complete = False")

visits = requests.get(f"{BASE}/visits/me", headers=headers).json()
for v in visits:
    requests.delete(f"{BASE}/visits/{v['id']}", headers=headers)
ok(f"Cleared {len(visits)} existing visits")

# 3. Search for cafes
step("Search for cafes")
r = requests.get(f"{BASE}/cafes/search?q=coffee", headers=headers)
if r.status_code != 200:
    fail(f"Search failed ({r.status_code})", r.text)
cafes = r.json()
if len(cafes) < 3:
    fail(f"Not enough cafes to rate (got {len(cafes)})")
ok(f"Found {len(cafes)} cafes")

# 4. Rate 3 cafes (simulate onboarding)
step("Rate 3 cafes")
for i, cafe in enumerate(cafes[:3]):
    r = requests.post(f"{BASE}/visits", json={
        "cafe_id": cafe["id"],
        "thumb": "up",
        "checkin_now": False,
    }, headers=headers)
    if r.status_code != 201:
        fail(f"Rating cafe {i+1} failed ({r.status_code})", r.text)
    ok(f"Rated [{i+1}/3]: {cafe['name']} — thumb up")

# 5. Confirm 3 visits exist
step("Confirm visits saved")
visits = requests.get(f"{BASE}/visits/me", headers=headers).json()
if len(visits) < 3:
    fail(f"Expected 3 visits, got {len(visits)}")
ok(f"{len(visits)} visits in journal")

# 6. Complete onboarding
step("Complete onboarding (PATCH onboarding_complete=True)")
r = requests.patch(f"{BASE}/users/me", json={"onboarding_complete": True}, headers=headers)
if r.status_code != 200:
    fail(f"PATCH failed ({r.status_code})", r.text)
user = r.json()
if not user["onboarding_complete"]:
    fail("onboarding_complete is still False after PATCH")
ok("onboarding_complete = True")

# 7. Fetch recommendations
step("Fetch 'What's on Brew Today'")
r = requests.get(f"{BASE}/discovery/brew-today", headers=headers)
if r.status_code != 200:
    fail(f"Discovery failed ({r.status_code})", r.text)
data = r.json()
if not data.get("unlocked"):
    fail("Recommendations not unlocked", str(data))
ok(f"Revisit: {data['revisit']['name'] if data.get('revisit') else 'none'}")
ok(f"New place: {data['new_place']['name'] if data.get('new_place') else 'none'}")

print("\n✓ Full onboarding workflow passed.\n")
