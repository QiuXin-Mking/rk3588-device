from fastapi import APIRouter, Depends

from app.api.deps import get_current_active_superuser
from app.model import Message

router = APIRouter(prefix="/utils", tags=["utils"])


@router.get("/health-check/")
async def health_check() -> bool:
    """
    Health check endpoint.
    """
    return True


@router.post(
    "/test-superuser/",
    dependencies=[Depends(get_current_active_superuser)],
    status_code=201,
)
async def test_superuser() -> Message:
    """
    Test that superuser auth is working.
    """
    return Message(message="Superuser auth OK")
