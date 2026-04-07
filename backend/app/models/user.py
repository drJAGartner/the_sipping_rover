import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY, INTEGER

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(64), nullable=False)
    home_cafe_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("cafes.id"), nullable=True)
    default_review_visibility: Mapped[str] = mapped_column(String(10), default="public")
    # Ranked list of 9 characteristic indices (0-8), most important first
    characteristic_ordering: Mapped[list[int]] = mapped_column(ARRAY(INTEGER), default=list(range(9)))
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    notify_new_follower: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_followed_rating: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_monthly_recap: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_inactivity: Mapped[bool] = mapped_column(Boolean, default=True)
    onboarding_complete: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    home_cafe: Mapped[Optional["Cafe"]] = relationship("Cafe", foreign_keys=[home_cafe_id])
    visits: Mapped[list["Visit"]] = relationship("Visit", back_populates="user")
    following: Mapped[list["Follow"]] = relationship("Follow", foreign_keys="Follow.follower_id", back_populates="follower")
    followers: Mapped[list["Follow"]] = relationship("Follow", foreign_keys="Follow.followee_id", back_populates="followee")
    tier_lists: Mapped[list["TierList"]] = relationship("TierList", back_populates="user")
