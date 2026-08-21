from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.database import get_session
from app.core.dependencies import AdminDep
from app.features.dashboard.schemas import DashboardMetrics
from app.features.dashboard.service import DashboardService

router = APIRouter(prefix="/dashboard")


def _get_svc(session=Depends(get_session)) -> DashboardService:
    return DashboardService(session=session)


SvcDep = Annotated[DashboardService, Depends(_get_svc)]


@router.get("/metrics", response_model=DashboardMetrics, summary="Get platform metrics (ADMIN)")
async def get_metrics(
    _: AdminDep,
    svc: SvcDep,
    months: Annotated[
        int, Query(ge=1, le=24, description="Window for signups/score trend charts")
    ] = 6,
):
    return await svc.get_metrics(months=months)
