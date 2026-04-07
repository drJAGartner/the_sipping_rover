#!/usr/bin/env python3
"""Test user registration workflow against the running backend."""
import sys
import requests

BASE = "http://localhost:8000"
TEST_EMAIL = "testrover@example.com"
TEST_PASSWORD = "testpassword123"
TEST_NAME = "Test Rover"


def step(msg):
    print(f"\n>>> {msg}")


def ok(msg):
    print(f"    ✓ {msg}")


def fail(msg, detail=None):
    print(f"    ✗ {msg}")
    if detail:
        print(f"      {detail}")
    sys.exit(1)


# 1. Health check
step("Health check")
try:
    r = requests.get(f"{BASE}/health", timeout=5)
    r.raise_for_status()
    ok(f"Backend up: {r.json()}")
except Exception as e:
    fail("Backend not reachable", str(e))

# 2. Register
step(f"Register user ({TEST_EMAIL})")
r = requests.post(f"{BASE}/auth/register", json={
    "email": TEST_EMAIL,
    "password": TEST_PASSWORD,
    "display_name": TEST_NAME,
})
if r.status_code == 400 and "already registered" in r.text:
    ok("User already exists — skipping registration, proceeding to login")
    token = None
elif r.status_code == 201:
    token = r.json()["access_token"]
    ok(f"Registered, token: {token[:20]}...")
else:
    fail(f"Registration failed ({r.status_code})", r.text)

# 3. Login
step("Login")
r = requests.post(f"{BASE}/auth/token", data={
    "username": TEST_EMAIL,
    "password": TEST_PASSWORD,
})
if r.status_code != 200:
    fail(f"Login failed ({r.status_code})", r.text)
token = r.json()["access_token"]
ok(f"Token: {token[:20]}...")

# 4. Get /users/me
step("Fetch profile")
r = requests.get(f"{BASE}/users/me", headers={"Authorization": f"Bearer {token}"})
if r.status_code != 200:
    fail(f"GET /users/me failed ({r.status_code})", r.text)
me = r.json()
ok(f"User: id={me['id']}, name={me['display_name']}, onboarding={me['onboarding_complete']}")

print("\n✓ Registration workflow passed.\n")
