from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from backend.routers import auth
import os

app = FastAPI(title="Typing Game API")

app.add_middleware(
    SessionMiddleware, 
    secret_key=os.getenv("JWT_SECRET", "fallback_secret_for_dev"),
    https_only=False
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)

@app.get("/")
async def root():
    return {"message": "Typing Game Backend Active"}