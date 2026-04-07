import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.tier_list import TierList, TierListEntry
from app.models.user import User

router = APIRouter(prefix="/tier-lists", tags=["tier-lists"])


class TierEntryIn(BaseModel):
    cafe_id: uuid.UUID
    tier: str
    position: int


class TierListCreate(BaseModel):
    name: str
    entries: list[TierEntryIn]
    visibility: str = "public"


class TierListUpdate(BaseModel):
    name: str | None = None
    entries: list[TierEntryIn] | None = None
    visibility: str | None = None


def _serialize(tl: TierList) -> dict:
    return {
        "id": str(tl.id),
        "name": tl.name,
        "visibility": tl.visibility,
        "created_at": tl.created_at,
        "updated_at": tl.updated_at,
        "entries": [
            {
                "id": str(e.id),
                "cafe_id": str(e.cafe_id),
                "cafe_name": e.cafe.name if e.cafe else None,
                "cafe_website": e.cafe.website if e.cafe else None,
                "cafe_photo_url": e.cafe.photo_url if e.cafe else None,
                "tier": e.tier,
                "position": e.position,
            }
            for e in tl.entries
        ],
    }


@router.post("", status_code=201)
async def create_tier_list(body: TierListCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    tl = TierList(user_id=current_user.id, name=body.name, visibility=body.visibility)
    db.add(tl)
    await db.flush()

    for e in body.entries:
        db.add(TierListEntry(tier_list_id=tl.id, cafe_id=e.cafe_id, tier=e.tier, position=e.position))

    await db.commit()
    result = await db.execute(
        select(TierList).where(TierList.id == tl.id).options(selectinload(TierList.entries).selectinload(TierListEntry.cafe))
    )
    return _serialize(result.scalar_one())


@router.patch("/{tier_list_id}", status_code=200)
async def update_tier_list(tier_list_id: uuid.UUID, body: TierListUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TierList).where(TierList.id == tier_list_id, TierList.user_id == current_user.id)
        .options(selectinload(TierList.entries).selectinload(TierListEntry.cafe))
    )
    tl = result.scalar_one_or_none()
    if not tl:
        raise HTTPException(status_code=404, detail="Tier list not found")

    if body.name is not None:
        tl.name = body.name
    if body.visibility is not None:
        tl.visibility = body.visibility
    if body.entries is not None:
        for entry in list(tl.entries):
            await db.delete(entry)
        await db.flush()
        for e in body.entries:
            db.add(TierListEntry(tier_list_id=tl.id, cafe_id=e.cafe_id, tier=e.tier, position=e.position))

    await db.commit()
    result = await db.execute(
        select(TierList).where(TierList.id == tl.id).options(selectinload(TierList.entries).selectinload(TierListEntry.cafe))
    )
    return _serialize(result.scalar_one())


@router.delete("/{tier_list_id}", status_code=204)
async def delete_tier_list(tier_list_id: uuid.UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TierList).where(TierList.id == tier_list_id, TierList.user_id == current_user.id))
    tl = result.scalar_one_or_none()
    if tl:
        await db.delete(tl)
        await db.commit()


@router.get("/{tier_list_id}")
async def get_tier_list(tier_list_id: uuid.UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TierList).where(TierList.id == tier_list_id)
        .options(selectinload(TierList.entries).selectinload(TierListEntry.cafe))
    )
    tl = result.scalar_one_or_none()
    if not tl:
        raise HTTPException(status_code=404, detail="Tier list not found")
    if tl.visibility != "public" and tl.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return _serialize(tl)


@router.get("/user/{user_id}")
async def get_user_tier_lists(user_id: uuid.UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    is_self = user_id == current_user.id
    query = select(TierList).where(TierList.user_id == user_id)
    if not is_self:
        query = query.where(TierList.visibility == "public")
    result = await db.execute(
        query.order_by(TierList.created_at.desc())
        .options(selectinload(TierList.entries).selectinload(TierListEntry.cafe))
    )
    return [_serialize(tl) for tl in result.scalars().all()]
