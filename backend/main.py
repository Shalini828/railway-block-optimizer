from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.trains import router as trains_router

app = FastAPI(
    title="Railway Block Optimizer API",
    description="AI-powered maintenance and block planning system for railway operations",
    version="1.0.0"
)

# Allow React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "Railway Block Optimizer API is running!"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "railway-block-optimizer"
    }

app.include_router(trains_router)