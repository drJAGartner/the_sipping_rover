import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, get_optional_user
from app.database import get_db
from app.models.user import User
from app.models.follow import Follow
from app.schemas.user import UserOut, UserUpdate, UserProfile

router = APIRouter(prefix="/users", tags=["users"])


def _user_out(user: User) -> UserOut:
    return UserOut(
        **{c.key: getattr(user, c.key) for c in user.__table__.columns},
        home_cafe_name=user.home_cafe.name if user.home_cafe else None,
    )


async def _get_user_with_cafe(user_id, db: AsyncSession) -> User:
    result = await db.execute(
        select(User).where(User.id == user_id).options(selectinload(User.home_cafe))
    )
    return result.scalar_one_or_none()


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await _get_user_with_cafe(current_user.id, db)
    return _user_out(user)


@router.patch("/me", response_model=UserOut)
async def update_me(body: UserUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    await db.commit()
    user = await _get_user_with_cafe(current_user.id, db)
    return _user_out(user)


@router.get("/{user_id}", response_model=UserProfile)
async def get_profile(user_id: uuid.UUID, current_user: User = Depends(get_optional_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    follower_count = await db.scalar(select(func.count()).where(Follow.followee_id == user_id))
    following_count = await db.scalar(select(func.count()).where(Follow.follower_id == user_id))

    is_following = False
    if current_user and current_user.id != user_id:
        existing = await db.scalar(
            select(func.count()).where(Follow.follower_id == current_user.id, Follow.followee_id == user_id)
        )
        is_following = (existing or 0) > 0

    return UserProfile(
        id=user.id,
        display_name=user.display_name,
        home_cafe_id=user.home_cafe_id,
        follower_count=follower_count or 0,
        following_count=following_count or 0,
        is_following=is_following,
    )


@router.post("/{user_id}/follow", status_code=204)
async def follow_user(user_id: uuid.UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    existing = await db.execute(select(Follow).where(Follow.follower_id == current_user.id, Follow.followee_id == user_id))
    if existing.scalar_one_or_none():
        return

    db.add(Follow(follower_id=current_user.id, followee_id=user_id))
    await db.commit()


@router.delete("/{user_id}/follow", status_code=204)
async def unfollow_user(user_id: uuid.UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Follow).where(Follow.follower_id == current_user.id, Follow.followee_id == user_id))
    follow = result.scalar_one_or_none()
    if follow:
        await db.delete(follow)
        await db.commit()
