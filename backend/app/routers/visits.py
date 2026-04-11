import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc, nullslast
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.visit import Visit
from app.models.cafe import Cafe
from app.models.user import User
from app.models.follow import Follow
from app.schemas.visit import VisitCreate, VisitUpdate, VisitOut, PublicVisitOut

router = APIRouter(prefix="/visits", tags=["visits"])


def _enrich(visit: Visit) -> dict:
    d = {c.key: getattr(visit, c.key) for c in visit.__table__.columns}
    d["cafe_name"] = visit.cafe.name if visit.cafe else None
    d["cafe_address"] = visit.cafe.address if visit.cafe else None
    d["cafe_website"] = visit.cafe.website if visit.cafe else None
    return d


def _enrich_public(visit: Visit) -> dict:
    d = _enrich(visit)
    d["user_display_name"] = visit.user.display_name if visit.user else "Unknown"
    return d


@router.get("/me", response_model=list[VisitOut])
async def my_visits(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Visit).where(Visit.user_id == current_user.id).options(selectinload(Visit.cafe))
    )
    return [_enrich(v) for v in result.scalars().all()]


@router.post("", response_model=VisitOut, status_code=201)
async def create_or_update_visit(body: VisitCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Verify cafe exists
    cafe = await db.scalar(select(Cafe).where(Cafe.id == body.cafe_id, Cafe.is_active == True))
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")

    # Upsert: one rating per user per cafe
    result = await db.execute(select(Visit).where(Visit.user_id == current_user.id, Visit.cafe_id == body.cafe_id))
    visit = result.scalar_one_or_none()

    data = body.model_dump(exclude={"cafe_id", "checkin_now"})
    now = datetime.now(timezone.utc)

    if visit is None:
        visit = Visit(user_id=current_user.id, cafe_id=body.cafe_id, **data)
        if body.checkin_now:
            visit.last_checkin_at = now
        db.add(visit)
    else:
        for field, value in data.items():
            if value is not None:
                setattr(visit, field, value)
        if body.checkin_now:
            visit.last_checkin_at = now

    # Apply user's default visibility if not specified
    if visit.visibility is None:
        visit.visibility = current_user.default_review_visibility

    await db.commit()
    await db.refresh(visit)
    await db.execute(select(Cafe).where(Cafe.id == visit.cafe_id))  # ensure loaded
    result = await db.execute(
        select(Visit).where(Visit.id == visit.id).options(selectinload(Visit.cafe))
    )
    return _enrich(result.scalar_one())


@router.patch("/{visit_id}", response_model=VisitOut)
async def update_visit(visit_id: uuid.UUID, body: VisitUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Visit).where(Visit.id == visit_id, Visit.user_id == current_user.id))
    visit = result.scalar_one_or_none()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(visit, field, value)

    await db.commit()
    await db.refresh(visit)
    return visit


@router.delete("/{visit_id}", status_code=204)
async def delete_visit(visit_id: uuid.UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Visit).where(Visit.id == visit_id, Visit.user_id == current_user.id))
    visit = result.scalar_one_or_none()
    if visit:
        await db.delete(visit)
        await db.commit()


@router.get("/cafe/{cafe_id}/mine", response_model=VisitOut)
async def my_visit_for_cafe(cafe_id: uuid.UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Visit).where(Visit.user_id == current_user.id, Visit.cafe_id == cafe_id).options(selectinload(Visit.cafe))
    )
    visit = result.scalar_one_or_none()
    if not visit:
        raise HTTPException(status_code=404, detail="No visit found")
    return _enrich(visit)


@router.get("/cafe/{cafe_id}/public", response_model=list[PublicVisitOut])
async def public_visits_for_cafe(cafe_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Visit)
        .where(Visit.cafe_id == cafe_id, Visit.visibility == "public")
        .options(selectinload(Visit.cafe), selectinload(Visit.user))
        .order_by(nullslast(desc(Visit.last_checkin_at)), desc(Visit.updated_at))
    )
    return [_enrich_public(v) for v in result.scalars().all()]


@router.get("/user/{user_id}", response_model=list[PublicVisitOut])
async def user_public_visits(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Visit)
        .where(Visit.user_id == user_id, Visit.visibility == "public")
        .options(selectinload(Visit.cafe), selectinload(Visit.user))
        .order_by(nullslast(desc(Visit.last_checkin_at)), desc(Visit.updated_at))
    )
    return [_enrich_public(v) for v in result.scalars().all()]


@router.get("/feed", response_model=list[PublicVisitOut])
async def feed(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    follows = await db.execute(
        select(Follow.followee_id).where(Follow.follower_id == current_user.id)
    )
    followee_ids = [row[0] for row in follows.all()]
    if not followee_ids:
        return []
    result = await db.execute(
        select(Visit)
        .where(Visit.user_id.in_(followee_ids), Visit.visibility == "public")
        .options(selectinload(Visit.cafe), selectinload(Visit.user))
        .order_by(nullslast(desc(Visit.last_checkin_at)), desc(Visit.updated_at))
        .limit(50)
    )
    return [_enrich_public(v) for v in result.scalars().all()]
