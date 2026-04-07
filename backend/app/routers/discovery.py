from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.user import User
from app.models.visit import Visit
from app.models.cafe import Cafe
from app.models.follow import Follow
from app.schemas.cafe import CafeOut

router = APIRouter(prefix="/discovery", tags=["discovery"])

CHARACTERISTICS = ["coffee_quality", "food", "price", "noise", "crowd", "aesthetic", "comfort", "wifi", "privacy"]
TWO_WEEKS = timedelta(days=14)
YELP_THRESHOLD = 5


def score_visit(visit: Visit, ordering: list[int]) -> float:
    scores = [
        visit.coffee_quality, visit.food, visit.price,
        visit.noise, visit.crowd, visit.aesthetic,
        visit.comfort, visit.wifi, visit.privacy,
    ]
    total = 0.0
    weight = len(ordering)
    for rank, idx in enumerate(ordering):
        total += scores[idx] * (weight - rank)
    return total


@router.get("/brew-today")
async def brew_today(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Visit).where(Visit.user_id == current_user.id))
    visits = result.scalars().all()

    if len(visits) < 3:
        return {"unlocked": False, "message": f"Rate {3 - len(visits)} more cafe(s) to unlock recommendations"}

    ordering = current_user.characteristic_ordering
    now = datetime.now(timezone.utc)
    cutoff = now - TWO_WEEKS

    # Get all active cafes
    all_cafes_result = await db.execute(select(Cafe).where(Cafe.is_active == True))
    all_cafes = {c.id: c for c in all_cafes_result.scalars().all()}

    visited_ids = {v.cafe_id for v in visits}

    # Revisit: rated cafe not checked in within 2 weeks
    revisit_candidates = [
        v for v in visits
        if v.last_checkin_at is None or v.last_checkin_at < cutoff
    ]
    # Prefer home cafe if set
    home_id = current_user.home_cafe_id
    if home_id and home_id in {v.cafe_id for v in revisit_candidates}:
        revisit_visit = next(v for v in revisit_candidates if v.cafe_id == home_id)
    else:
        revisit_visit = max(revisit_candidates, key=lambda v: score_visit(v, ordering), default=None)

    revisit_cafe = all_cafes.get(revisit_visit.cafe_id) if revisit_visit else None

    # New: not yet visited — score using platform average ratings
    unvisited = [c for cid, c in all_cafes.items() if cid not in visited_ids]

    # Score unvisited by platform visit averages
    scored_unvisited = []
    for cafe in unvisited:
        platform_visits_result = await db.execute(select(Visit).where(Visit.cafe_id == cafe.id))
        platform_visits = platform_visits_result.scalars().all()
        if platform_visits:
            avg_visit = type("V", (), {
                ch: sum(getattr(v, ch) for v in platform_visits) / len(platform_visits)
                for ch in CHARACTERISTICS
            })()
            scored_unvisited.append((score_visit(avg_visit, ordering), cafe))
        else:
            scored_unvisited.append((0, cafe))

    scored_unvisited.sort(key=lambda x: x[0], reverse=True)
    new_cafe = scored_unvisited[0][1] if scored_unvisited else None

    def cafe_resp(cafe, count):
        if cafe is None:
            return None
        return {
            "id": str(cafe.id),
            "name": cafe.name,
            "address": cafe.address,
            "lat": cafe.lat,
            "lng": cafe.lng,
            "platform_rating_count": count,
            "yelp_link": count < YELP_THRESHOLD,
        }

    revisit_count = 0
    new_count = 0
    if revisit_cafe:
        revisit_count = await db.scalar(
            select(__import__("sqlalchemy").func.count()).where(Visit.cafe_id == revisit_cafe.id)
        )
    if new_cafe:
        new_count = await db.scalar(
            select(__import__("sqlalchemy").func.count()).where(Visit.cafe_id == new_cafe.id)
        )

    return {
        "unlocked": True,
        "revisit": cafe_resp(revisit_cafe, revisit_count or 0),
        "new_place": cafe_resp(new_cafe, new_count or 0),
    }


@router.get("/friend-blend")
async def friend_blend(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    ordering = current_user.characteristic_ordering

    # Get IDs of users I follow
    follow_result = await db.execute(select(Follow.followee_id).where(Follow.follower_id == current_user.id))
    followee_ids = [row[0] for row in follow_result.all()]

    if not followee_ids:
        return {"empty": True, "message": "Follow more rovers to unlock this mode", "fallback": True}

    # My visited cafe IDs
    my_visits_result = await db.execute(select(Visit.cafe_id).where(Visit.user_id == current_user.id))
    my_cafe_ids = {row[0] for row in my_visits_result.all()}

    # Public visits from followed users for cafes I haven't been to
    network_visits_result = await db.execute(
        select(Visit).where(
            Visit.user_id.in_(followee_ids),
            Visit.cafe_id.notin_(my_cafe_ids),
            Visit.visibility == "public",
        )
    )
    network_visits = network_visits_result.scalars().all()

    if not network_visits:
        return {"empty": True, "message": "Your network hasn't discovered anywhere new yet — follow more rovers", "fallback": True}

    # Score by network visits using user's ordering
    cafe_scores: dict = {}
    for v in network_visits:
        s = score_visit(v, ordering)
        cafe_scores[v.cafe_id] = cafe_scores.get(v.cafe_id, 0) + s

    best_cafe_id = max(cafe_scores, key=lambda k: cafe_scores[k])
    cafe = await db.scalar(select(Cafe).where(Cafe.id == best_cafe_id))

    count = await db.scalar(
        select(__import__("sqlalchemy").func.count()).where(Visit.cafe_id == best_cafe_id)
    )

    return {
        "empty": False,
        "recommendation": {
            "id": str(cafe.id),
            "name": cafe.name,
            "address": cafe.address,
            "lat": cafe.lat,
            "lng": cafe.lng,
            "platform_rating_count": count or 0,
            "yelp_link": (count or 0) < YELP_THRESHOLD,
        },
    }
