from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.trains import router as trains_router
from routes.block_requests import router as block_requests_router
from routes.optimization import router as optimization_router
from routes.conflict_detection import router as conflict_router
from routes.optimized_plan import router as optimized_plan_router
from routes.dashboard import router as dashboard_router
from routes.maintenance_tasks import router as maintenance_tasks_router
from routes.analytics import router as analytics_router

app = FastAPI(
    title="Railway Block Optimizer API",
    description="AI-powered maintenance and block planning system for railway operations",
    version="1.0.0"
)

# Allow React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:8080",
    "http://localhost:5173",
],
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
app.include_router(block_requests_router)
app.include_router(optimization_router)
app.include_router(conflict_router)
app.include_router(optimized_plan_router)
app.include_router(dashboard_router)
app.include_router(maintenance_tasks_router)
app.include_router(analytics_router)