import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator
from better_profanity import profanity


class VisitCreate(BaseModel):
    cafe_id: uuid.UUID
    thumb: Optional[str] = None  # 'up' | 'down'
    coffee_quality: int = 2
    food: int = 2
    price: int = 2
    noise: int = 2
    crowd: int = 2
    aesthetic: int = 2
    comfort: int = 2
    wifi: int = 2
    privacy: int = 2
    notes: Optional[str] = None
    visibility: str = "public"
    checkin_now: bool = False
    has_details: bool = False

    @field_validator("notes")
    @classmethod
    def filter_profanity(cls, v):
        if v is None:
            return v
        if len(v) > 250:
            raise ValueError("Notes must be 250 characters or fewer")
        if profanity.contains_profanity(v):
            raise ValueError("Notes contain inappropriate language")
        return v

    @field_validator("thumb")
    @classmethod
    def validate_thumb(cls, v):
        if v is not None and v not in ("up", "down"):
            raise ValueError("thumb must be 'up' or 'down'")
        return v


class VisitUpdate(BaseModel):
    thumb: Optional[str] = None
    coffee_quality: Optional[int] = None
    food: Optional[int] = None
    price: Optional[int] = None
    noise: Optional[int] = None
    crowd: Optional[int] = None
    aesthetic: Optional[int] = None
    comfort: Optional[int] = None
    wifi: Optional[int] = None
    privacy: Optional[int] = None
    notes: Optional[str] = None
    visibility: Optional[str] = None
    has_details: Optional[bool] = None

    @field_validator("notes")
    @classmethod
    def filter_profanity(cls, v):
        if v is None:
            return v
        if len(v) > 250:
            raise ValueError("Notes must be 250 characters or fewer")
        if profanity.contains_profanity(v):
            raise ValueError("Notes contain inappropriate language")
        return v


class VisitOut(BaseModel):
    id: uuid.UUID
    cafe_id: uuid.UUID
    cafe_name: Optional[str] = None
    cafe_address: Optional[str] = None
    cafe_website: Optional[str] = None
    thumb: Optional[str]
    coffee_quality: int
    food: int
    price: int
    noise: int
    crowd: int
    aesthetic: int
    comfort: int
    wifi: int
    privacy: int
    has_details: bool
    notes: Optional[str]
    visibility: str
    last_checkin_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
