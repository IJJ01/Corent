from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.grpc_clients import GrpcClients
from app.routes.health import router as health_router
from app.routes.auth import router as auth_router
from app.routes.me import router as me_router
from app.routes.houses import router as houses_router
from app.routes.applications import router as applications_router
from app.routes.reports import router as reports_router
from app.routes.admin_reports import router as admin_reports_router
from app.routes.admin import router as admin_router
from app.routes.notifications import router as notifications_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create reusable gRPC clients
    app.state.grpc = GrpcClients()
    yield
    # Shutdown: close channels
    app.state.grpc.close()


app = FastAPI(title="Co-Rent API Gateway", lifespan=lifespan)

# CORS for React
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(me_router)
app.include_router(houses_router)
app.include_router(applications_router)
app.include_router(reports_router)
app.include_router(admin_reports_router)
app.include_router(admin_router)
app.include_router(notifications_router)