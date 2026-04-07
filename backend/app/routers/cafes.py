import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, get_admin_user
from app.database import get_db
from app.models.cafe import Cafe
from app.models.visit import Visit
from app.models.user import User
from app.schemas.cafe import CafeOut, CafeCreate
from app.services.places import search_google_places
from app.services.logo_scraper import fetch_logo_url

router = APIRouter(prefix="/cafes", tags=["cafes"])


async def _cafe_with_count(cafe: Cafe, db: AsyncSession) -> CafeOut:
    count = await db.scalar(select(func.count()).where(Visit.cafe_id == cafe.id))
    out = CafeOut.model_validate(cafe)
    out.platform_rating_count = count or 0
    return out


@router.post("", response_model=CafeOut, status_code=201)
async def create_cafe(body: CafeCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    cafe = Cafe(**body.model_dump())
    db.add(cafe)
    await db.commit()
    await db.refresh(cafe)
    return await _cafe_with_count(cafe, db)


@router.get("/search")
async def search_cafes(q: str = Query(..., min_length=2), db: AsyncSession = Depends(get_db)):
    # Search local catalog first
    result = await db.execute(
        select(Cafe).where(Cafe.name.ilike(f"%{q}%"), Cafe.is_active == True).limit(10)
    )
    local = result.scalars().all()

    # If fewer than 3 local results, try Google Places then Yelp as fallback
    external_cafes = []
    if len(local) < 3:
        external = await search_google_places(q)
        for place in external:
            # Deduplicate by google_places_id if present, otherwise by name+address
            if place.get("google_places_id"):
                existing = await db.scalar(select(Cafe).where(Cafe.google_places_id == place["google_places_id"]))
            else:
                existing = await db.scalar(select(Cafe).where(Cafe.name == place["name"], Cafe.address == place["address"]))
            if not existing:
                cafe = Cafe(**{k: v for k, v in place.items() if hasattr(Cafe, k)})
                db.add(cafe)
                external_cafes.append(cafe)
            else:
                external_cafes.append(existing)
        if external:
            await db.commit()
            for cafe in external_cafes:
                await db.refresh(cafe)

    # Merge local name-matches with external results, deduplicated
    seen = {c.id for c in local}
    all_cafes = list(local)
    for cafe in external_cafes:
        if cafe.id not in seen:
            seen.add(cafe.id)
            all_cafes.append(cafe)

    return [await _cafe_with_count(c, db) for c in all_cafes[:10]]


@router.get("/nearby")
async def nearby_cafes(lat: float = Query(...), lng: float = Query(...), radius_m: float = Query(50), db: AsyncSession = Depends(get_db)):
    # Rough bounding box filter — 1 degree lat ≈ 111km
    delta = radius_m / 111_000
    result = await db.execute(
        select(Cafe).where(
            Cafe.lat.between(lat - delta, lat + delta),
            Cafe.lng.between(lng - delta, lng + delta),
            Cafe.is_active == True,
        )
    )
    cafes = result.scalars().all()
    return [await _cafe_with_count(c, db) for c in cafes]


@router.get("/{cafe_id}", response_model=CafeOut)
async def get_cafe(cafe_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Cafe).where(Cafe.id == cafe_id, Cafe.is_active == True))
    cafe = result.scalar_one_or_none()
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")
    return await _cafe_with_count(cafe, db)


@router.post("/{cafe_id}/fetch-logo", response_model=CafeOut)
async def fetch_cafe_logo(cafe_id: uuid.UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Cafe).where(Cafe.id == cafe_id, Cafe.is_active == True))
    cafe = result.scalar_one_or_none()
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")
    if cafe.website:
        logo_url = await fetch_logo_url(cafe.website)
        if logo_url:
            cafe.photo_url = logo_url
            await db.commit()
            await db.refresh(cafe)
    return await _cafe_with_count(cafe, db)


@router.delete("/{cafe_id}", status_code=204)
async def deactivate_cafe(cafe_id: uuid.UUID, admin=Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Cafe).where(Cafe.id == cafe_id))
    cafe = result.scalar_one_or_none()
    if cafe:
        cafe.is_active = False
        await db.commit()
