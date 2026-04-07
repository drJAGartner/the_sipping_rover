import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, DateTime, SmallInteger, Text, ForeignKey, func  # noqa: F401
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base

# Characteristic indices (order matches the 9 characteristics):
# 0: coffee_quality, 1: food, 2: price
# 3: noise, 4: crowd, 5: aesthetic
# 6: comfort, 7: wifi, 8: privacy


class Visit(Base):
    __tablename__ = "visits"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    cafe_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cafes.id", ondelete="CASCADE"), nullable=False, index=True)

    # Thumb rating
    thumb: Mapped[Optional[str]] = mapped_column(String(4), nullable=True)  # 'up' | 'down'

    # 9 characteristic scores (1=bad, 2=ok, 3=great), all default 2
    coffee_quality: Mapped[int] = mapped_column(SmallInteger, default=2)
    food: Mapped[int] = mapped_column(SmallInteger, default=2)
    price: Mapped[int] = mapped_column(SmallInteger, default=2)
    noise: Mapped[int] = mapped_column(SmallInteger, default=2)
    crowd: Mapped[int] = mapped_column(SmallInteger, default=2)
    aesthetic: Mapped[int] = mapped_column(SmallInteger, default=2)
    comfort: Mapped[int] = mapped_column(SmallInteger, default=2)
    wifi: Mapped[int] = mapped_column(SmallInteger, default=2)
    privacy: Mapped[int] = mapped_column(SmallInteger, default=2)

    has_details: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    visibility: Mapped[str] = mapped_column(String(10), default="public")
    last_checkin_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship("User", back_populates="visits")
    cafe: Mapped["Cafe"] = relationship("Cafe", back_populates="visits")

    # One rating per user per cafe
    __table_args__ = (
        __import__("sqlalchemy").UniqueConstraint("user_id", "cafe_id", name="uq_visit_user_cafe"),
    )
