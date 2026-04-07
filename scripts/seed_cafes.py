#!/usr/bin/env python3
"""Seed the 6 South Austin cafes into the database."""
import requests

BASE = "http://localhost:8000"

CAFES = [
    {
        "name": "Summer Moon Coffee",
        "address": "3115 S 1st St, Austin, TX 78704",
        "lat": 30.2468,
        "lng": -97.7695,
        "google_places_id": "seed_summer_moon_s1st",
    },
    {
        "name": "Austin Java",
        "address": "5404 Menchaca Rd, Austin, TX 78745",
        "lat": 30.2218,
        "lng": -97.7897,
        "google_places_id": "seed_austin_java_menchaca",
    },
    {
        "name": "Jo's Coffee",
        "address": "5532 Menchaca Rd, Austin, TX 78745",
        "lat": 30.2198,
        "lng": -97.7899,
        "google_places_id": "seed_jos_menchaca",
    },
    {
        "name": "Radio Coffee & Beer",
        "address": "4204 Manchaca Rd, Austin, TX 78704",
        "lat": 30.2315,
        "lng": -97.7878,
        "google_places_id": "seed_radio_coffee",
    },
    {
        "name": "Spokesman Coffee",
        "address": "440 E Saint Elmo Rd, Austin, TX 78745",
        "lat": 30.2155,
        "lng": -97.7624,
        "google_places_id": "seed_spokesman_coffee",
    },
    {
        "name": "Cosmic Pickle",
        "address": "121 Pickle Rd, Austin, TX 78704",
        "lat": 30.2268,
        "lng": -97.7625,
        "google_places_id": "seed_cosmic_pickle",
    },
]


def get_admin_token():
    # Login as the test user (must already exist)
    r = requests.post(f"{BASE}/auth/token", data={
        "username": "testrover@example.com",
        "password": "testpassword123",
    })
    if r.status_code != 200:
        print(f"Login failed: {r.text}")
        return None
    return r.json()["access_token"]


# Insert cafes directly via a raw DB call inside the container
import subprocess, json

SEED_SCRIPT = """
import asyncio, json, sys
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
import os
sys.path.insert(0, '/app')
from app.models.cafe import Cafe

DATABASE_URL = os.environ['DATABASE_URL']
cafe = json.loads(sys.argv[1])

async def insert():
    engine = create_async_engine(DATABASE_URL)
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as db:
        existing = await db.scalar(select(Cafe).where(Cafe.google_places_id == cafe['google_places_id']))
        if existing:
            print(f"  already exists: {cafe['name']}")
            return
        c = Cafe(**{k: cafe[k] for k in ('name', 'address', 'lat', 'lng', 'google_places_id')})
        db.add(c)
        await db.commit()
        print(f"  inserted: {cafe['name']}")
    await engine.dispose()

asyncio.run(insert())
"""

for cafe in CAFES:
    result = subprocess.run(
        ["docker", "exec", "the_sipping_rover-backend-1", "python3", "-c", SEED_SCRIPT, json.dumps(cafe)],
        capture_output=True, text=True
    )
    print((result.stdout + result.stderr).strip())

print("\nVerifying search...")
r = requests.get(f"{BASE}/cafes/search?q=Spokesman")
print(f"Search 'Spokesman': {r.status_code} — {r.json()}")
r = requests.get(f"{BASE}/cafes/search?q=coffee")
print(f"Search 'coffee': {r.status_code} — {len(r.json())} results")
