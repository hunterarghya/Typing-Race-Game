from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from backend.routers import auth, game_ws, game_ops
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

app.mount("/static", StaticFiles(directory="frontend"), name="static")

app.include_router(auth.router)
app.include_router(game_ops.router)
app.include_router(game_ws.router)

@app.get("/")
async def root():
    return RedirectResponse(url="/static/index.html")