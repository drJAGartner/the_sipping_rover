from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, users, cafes, visits, discovery, tier_lists

app = FastAPI(title="The Sipping Rover", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://sipping-rover.com",
        "https://www.sipping-rover.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(cafes.router)
app.include_router(visits.router)
app.include_router(discovery.router)
app.include_router(tier_lists.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
