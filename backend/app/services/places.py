import httpx
from app.config import settings


async def search_google_places(query: str) -> list[dict]:
    if not settings.google_places_api_key:
        return []

    url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    params = {
        "query": f"{query} coffee shop",
        "type": "cafe",
        "key": settings.google_places_api_key,
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, timeout=5.0)
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return []

    if data.get("status") not in ("OK", "ZERO_RESULTS"):
        return []

    results = []
    for place in data.get("results", [])[:5]:
        loc = place.get("geometry", {}).get("location", {})
        results.append({
            "name": place["name"],
            "address": place.get("formatted_address", ""),
            "lat": loc.get("lat"),
            "lng": loc.get("lng"),
            "google_places_id": place["place_id"],
        })

    return results
