"""
MinIO client singleton and helper utilities.

Provides a lazily-initialized MinIO client and path generation helpers
used by the file upload routes.
"""

import math
import uuid
from datetime import datetime, timezone
from urllib.parse import urlsplit

from minio import Minio

from app.core.config import settings

# Lazy singleton — initialized on first call to ``get_minio_client()``.
_client: Minio | None = None


def get_minio_client() -> Minio:
    """Return a module-level MinIO client (singleton)."""
    global _client  # noqa: PLW0603
    if _client is None:
        _client = Minio(
            endpoint=settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            region="us-east-1",
            secure=settings.MINIO_USE_HTTPS,
        )
    return _client


def generate_object_path(folder: str, file_name: str) -> str:
    """
    Build a unique object key that preserves the original filename:
    ``{folder}{year}/{month}/{short_uuid}_{file_name}``.

    >>> generate_object_path("uploads/", "report.pdf")
    'uploads/2026/04/a1b2c3d4_report.pdf'
    """
    now = datetime.now(tz=timezone.utc)
    short_id = uuid.uuid4().hex[:8]
    safe_name = file_name.replace("/", "_").replace("\\", "_")
    return f"{folder}{now.year}/{now.month:02d}/{short_id}_{safe_name}"


def calculate_parts(file_size: int, chunk_size: int) -> int:
    """Return the number of parts required to upload *file_size* bytes."""
    return math.ceil(file_size / chunk_size)


def to_public_minio_url(presigned_url: str) -> str:
    """
    Rewrite an internal MinIO presigned URL to the public reverse-proxy path.

    The browser must never see the raw HTTP MinIO endpoint when the app is
    served over HTTPS, so we expose the same object path through ``/minio/``.
    """
    parsed = urlsplit(presigned_url)
    public_path = f"/minio{parsed.path}"
    if parsed.query:
        return f"{public_path}?{parsed.query}"
    return public_path
