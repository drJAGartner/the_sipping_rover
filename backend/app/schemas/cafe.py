import uuid
from typing import Optional
from pydantic import BaseModel


class CafeOut(BaseModel):
    id: uuid.UUID
    name: str
    address: str
    lat: Optional[float]
    lng: Optional[float]
    google_places_id: Optional[str]
    website: Optional[str] = None
    photo_url: Optional[str] = None
    platform_rating_count: int = 0

    model_config = {"from_attributes": True}


class CafeCreate(BaseModel):
    name: str
    address: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    google_places_id: Optional[str] = None
