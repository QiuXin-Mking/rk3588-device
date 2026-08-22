"""
API route tests for the file-upload module.

All MinIO calls are mocked — tests validate routing, validation,
schema output, and error handling without requiring a live MinIO instance.
"""

from io import BytesIO
from unittest.mock import MagicMock, patch

from httpx import AsyncClient

from app.core.config import settings

API_PREFIX = f"{settings.API_V1_STR}/files"


# ─── Helpers ────────────────────────────────────────────────────────────────


def _mock_minio_client() -> MagicMock:
    """Return a pre-configured MagicMock that mimics Minio client."""
    client = MagicMock()
    client._create_multipart_upload.return_value = "test-upload-id"
    client.get_presigned_url.return_value = "http://minio:9000/presigned-url"

    stat = MagicMock()
    stat.size = 524288000
    client.stat_object.return_value = stat

    # get_object returns iterable bytes
    client.get_object.return_value = BytesIO(b"file-content-here")
    return client


# ─── 1. Config ──────────────────────────────────────────────────────────────


async def test_read_upload_config(
    client: AsyncClient,
    superuser_token_headers: dict[str, str],
) -> None:
    r = await client.get(f"{API_PREFIX}/config", headers=superuser_token_headers)
    assert r.status_code == 200
    data = r.json()
    assert "chunk_threshold" in data
    assert "chunk_size" in data
    assert "max_file_size" in data
    assert data["chunk_threshold"] == settings.MINIO_CHUNK_THRESHOLD
    assert data["chunk_size"] == settings.MINIO_CHUNK_SIZE


# ─── 2. Proxy Upload ───────────────────────────────────────────────────────


async def test_upload_small_file(
    client: AsyncClient,
    superuser_token_headers: dict[str, str],
) -> None:
    mock_client = _mock_minio_client()
    with patch("app.api.routes.infra.files.get_minio_client", return_value=mock_client):
        r = await client.post(
            f"{API_PREFIX}/upload/",
            headers=superuser_token_headers,
            files={"file": ("test.txt", b"hello world", "text/plain")},
            data={"folder": "test/"},
        )

    assert r.status_code == 200
    data = r.json()
    assert data["file_name"] == "test.txt"
    assert data["file_size"] == 11
    assert data["file_path"].startswith("test/")
    assert data["file_path"].endswith(".txt")
    mock_client.put_object.assert_called_once()


async def test_upload_file_too_large(
    client: AsyncClient,
    superuser_token_headers: dict[str, str],
) -> None:
    """File exceeding chunk_threshold should be rejected with 400."""
    big_content = b"x" * (settings.MINIO_CHUNK_THRESHOLD + 1)
    r = await client.post(
        f"{API_PREFIX}/upload/",
        headers=superuser_token_headers,
        files={"file": ("big.bin", big_content, "application/octet-stream")},
    )
    assert r.status_code == 400
    assert "multipart upload" in r.json()["detail"].lower()


async def test_upload_file_no_auth(
    client: AsyncClient,
) -> None:
    """Upload without auth should return 401."""
    r = await client.post(
        f"{API_PREFIX}/upload/",
        files={"file": ("test.txt", b"hello", "text/plain")},
    )
    assert r.status_code == 401


# ─── 3. Multipart Upload ───────────────────────────────────────────────────


async def test_init_multipart_upload(
    client: AsyncClient,
    superuser_token_headers: dict[str, str],
) -> None:
    mock_client = _mock_minio_client()
    with patch("app.api.routes.infra.files.get_minio_client", return_value=mock_client):
        r = await client.post(
            f"{API_PREFIX}/upload/multipart/init",
            headers=superuser_token_headers,
            json={
                "file_name": "video.mp4",
                "file_size": 50 * 1024 * 1024,  # 50MB
                "folder": "videos/",
            },
        )

    assert r.status_code == 200
    data = r.json()
    assert data["upload_id"] == "test-upload-id"
    assert data["file_name"] == "video.mp4"
    assert data["file_path"].startswith("videos/")
    assert len(data["parts"]) > 0
    for part in data["parts"]:
        assert "part_number" in part
        assert "upload_url" in part
        assert part["upload_url"].startswith("/minio/")


async def test_init_multipart_upload_exceeds_max(
    client: AsyncClient,
    superuser_token_headers: dict[str, str],
) -> None:
    """File exceeding max_file_size should be rejected."""
    r = await client.post(
        f"{API_PREFIX}/upload/multipart/init",
        headers=superuser_token_headers,
        json={
            "file_name": "huge.bin",
            "file_size": settings.MINIO_MAX_FILE_SIZE + 1,
        },
    )
    assert r.status_code == 400


async def test_complete_multipart_upload(
    client: AsyncClient,
    superuser_token_headers: dict[str, str],
) -> None:
    mock_client = _mock_minio_client()
    with patch("app.api.routes.infra.files.get_minio_client", return_value=mock_client):
        r = await client.post(
            f"{API_PREFIX}/upload/multipart/complete",
            headers=superuser_token_headers,
            json={
                "upload_id": "test-upload-id",
                "file_path": "videos/2026/04/abc123.mp4",
                "file_name": "video.mp4",
                "parts": [
                    {"part_number": 1, "etag": '"etag1"'},
                    {"part_number": 2, "etag": '"etag2"'},
                ],
            },
        )

    assert r.status_code == 200
    data = r.json()
    assert data["file_path"] == "videos/2026/04/abc123.mp4"
    assert data["file_name"] == "video.mp4"
    assert data["file_size"] == 524288000
    mock_client._complete_multipart_upload.assert_called_once()


async def test_abort_multipart_upload(
    client: AsyncClient,
    superuser_token_headers: dict[str, str],
) -> None:
    mock_client = _mock_minio_client()
    with patch("app.api.routes.infra.files.get_minio_client", return_value=mock_client):
        r = await client.post(
            f"{API_PREFIX}/upload/multipart/abort",
            headers=superuser_token_headers,
            json={
                "upload_id": "test-upload-id",
                "file_path": "videos/2026/04/abc123.mp4",
            },
        )

    assert r.status_code == 200
    mock_client._abort_multipart_upload.assert_called_once()


# ─── 4. File Proxy ──────────────────────────────────────────────────────────


async def test_proxy_file(
    client: AsyncClient,
    superuser_token_headers: dict[str, str],
) -> None:
    mock_client = _mock_minio_client()
    with patch("app.api.routes.infra.files.get_minio_client", return_value=mock_client):
        r = await client.get(
            f"{API_PREFIX}/proxy/uploads/2026/04/test.txt",
            headers=superuser_token_headers,
        )

    assert r.status_code == 200
    assert r.content == b"file-content-here"


async def test_proxy_file_not_found(
    client: AsyncClient,
    superuser_token_headers: dict[str, str],
) -> None:
    mock_client = _mock_minio_client()
    mock_client.get_object.side_effect = Exception("NoSuchKey")
    with patch("app.api.routes.infra.files.get_minio_client", return_value=mock_client):
        r = await client.get(
            f"{API_PREFIX}/proxy/nonexistent/file.txt",
            headers=superuser_token_headers,
        )
    assert r.status_code == 404


async def test_proxy_file_no_auth(
    client: AsyncClient,
) -> None:
    """Authenticated proxy should reject unauthenticated requests."""
    r = await client.get(f"{API_PREFIX}/proxy/uploads/test.txt")
    assert r.status_code == 401


async def test_proxy_file_with_access_token_query(
    client: AsyncClient,
    superuser_token_headers: dict[str, str],
) -> None:
    token = superuser_token_headers["Authorization"].removeprefix("Bearer ")
    mock_client = _mock_minio_client()
    with patch("app.api.routes.infra.files.get_minio_client", return_value=mock_client):
        r = await client.get(
            f"{API_PREFIX}/proxy/uploads/2026/04/test.txt",
            params={"access_token": token},
        )

    assert r.status_code == 200
    assert r.content == b"file-content-here"
    assert "inline" in r.headers.get("content-disposition", "")


async def test_public_proxy_file(
    client: AsyncClient,
) -> None:
    """Public proxy should work without authentication."""
    mock_client = _mock_minio_client()
    with patch("app.api.routes.infra.files.get_minio_client", return_value=mock_client):
        r = await client.get(f"{API_PREFIX}/public-proxy/uploads/2026/04/test.txt")

    assert r.status_code == 200
    assert r.content == b"file-content-here"


async def test_public_proxy_file_not_found(
    client: AsyncClient,
) -> None:
    mock_client = _mock_minio_client()
    mock_client.get_object.side_effect = Exception("NoSuchKey")
    with patch("app.api.routes.infra.files.get_minio_client", return_value=mock_client):
        r = await client.get(f"{API_PREFIX}/public-proxy/nonexistent/file.txt")
    assert r.status_code == 404
