from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError


class BusinessException(Exception):
    """
    Generic business logic exception.
    Caught globally to return a standard JSON response without needing redundant HTTPExceptions.
    """

    def __init__(self, msg: str, code: int = 400):
        self.msg = msg
        self.code = code
        super().__init__(self.msg)


async def business_exception_handler(
    _request: Request, exc: BusinessException
) -> JSONResponse:
    """
    Intercepts any raised BusinessException and formats it.
    """
    return JSONResponse(
        status_code=exc.code,
        content={"detail": exc.msg, "error_code": "BUSINESS_LOGIC_ERROR"},
    )


async def sqlalchemy_exception_handler(
    _request: Request, _exc: SQLAlchemyError
) -> JSONResponse:
    """
    Intercepts any unhandled SQLAlchemy database error.
    Prevents raw DB traces from reaching the client (anti-fragile).
    """
    # In a real enterprise system, you would log `exc` to Sentry/DataDog here with a Trace ID.
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server database error.",
            "error_code": "DATABASE_ERROR",
        },
    )
