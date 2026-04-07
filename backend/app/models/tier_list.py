import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime, Integer, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class TierList(Base):
    __tablename__ = "tier_lists"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    visibility: Mapped[str] = mapped_column(String(10), default="public")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship("User", back_populates="tier_lists")
    entries: Mapped[list["TierListEntry"]] = relationship("TierListEntry", back_populates="tier_list", cascade="all, delete-orphan", order_by="TierListEntry.position")


class TierListEntry(Base):
    __tablename__ = "tier_list_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tier_list_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tier_lists.id", ondelete="CASCADE"), nullable=False, index=True)
    cafe_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cafes.id", ondelete="CASCADE"), nullable=False)
    tier: Mapped[str] = mapped_column(String(1), nullable=False)  # S, A, B, C, D, F
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    tier_list: Mapped["TierList"] = relationship("TierList", back_populates="entries")
    cafe: Mapped["Cafe"] = relationship("Cafe")
