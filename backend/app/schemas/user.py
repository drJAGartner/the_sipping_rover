import uuid
from typing import Optional
from pydantic import BaseModel, EmailStr


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    display_name: str
    home_cafe_id: Optional[uuid.UUID]
    home_cafe_name: Optional[str] = None
    default_review_visibility: str
    characteristic_ordering: list[int]
    onboarding_complete: bool

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    home_cafe_id: Optional[uuid.UUID] = None
    default_review_visibility: Optional[str] = None
    characteristic_ordering: Optional[list[int]] = None
    notify_new_follower: Optional[bool] = None
    notify_followed_rating: Optional[bool] = None
    notify_monthly_recap: Optional[bool] = None
    notify_inactivity: Optional[bool] = None
    onboarding_complete: Optional[bool] = None


class UserProfile(BaseModel):
    id: uuid.UUID
    display_name: str
    home_cafe_id: Optional[uuid.UUID]
    follower_count: int
    following_count: int

    model_config = {"from_attributes": True}
