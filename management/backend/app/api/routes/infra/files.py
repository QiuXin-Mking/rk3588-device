"""
File upload / download routes.

Strategy:
- Small files (≤ chunk_threshold): proxy upload via backend to MinIO
- Large files (> chunk_threshold): S3 multipart upload with presigned URLs

No DAO layer — this module talks directly to MinIO (object storage, not DB).
"""

import io
import mimetypes
from typing import Any
from urllib.parse import quote

from fastapi import APIRouter, Form, Request, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.api.deps import CurrentUser, CurrentUserForFileProxy
from app.core.config import settings
from app.core.exceptions import BusinessException
from app.core.minio import (
    calculate_parts,
    generate_object_path,
    get_minio_client,
    to_public_minio_url,
)

OFFICE_CONTENT_TYPES = {
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

router = APIRouter(
    prefix="/files",
    tags=["files"],
)

# --- Public router (no auth) ---
public_router = APIRouter(
    prefix="/files",
    tags=["files"],
)


# ─── Schemas ────────────────────────────────────────────────────────────────


class UploadConfigResponse(BaseModel):
    chunk_threshold: int
    chunk_size: int
    max_file_size: int


class FileUploadResponse(BaseModel):
    file_path: str
    file_name: str
    file_size: int


class MultipartInitRequest(BaseModel):
    file_name: str
    file_size: int
    folder: str = "omega/"


class PartInfo(BaseModel):
    part_number: int
    upload_url: str


class MultipartInitResponse(BaseModel):
    upload_id: str
    file_path: str
    file_name: str
    parts: list[PartInfo]


class PartETag(BaseModel):
    part_number: int
    etag: str


class MultipartCompleteRequest(BaseModel):
    upload_id: str
    file_path: str
    file_name: str = ""
    parts: list[PartETag]


class MultipartAbortRequest(BaseModel):
    upload_id: str
    file_path: str


# ─── 1. Upload Config ──────────────────────────────────────────────────────


@router.get("/config", response_model=UploadConfigResponse)
async def read_upload_config(_current_user: CurrentUser) -> Any:
    """Return upload thresholds so the frontend can auto-select strategy."""
    return UploadConfigResponse(
        chunk_threshold=settings.MINIO_CHUNK_THRESHOLD,
        chunk_size=settings.MINIO_CHUNK_SIZE,
        max_file_size=settings.MINIO_MAX_FILE_SIZE,
    )


# ─── 2. Proxy Upload (small files) ─────────────────────────────────────────


@router.post("/upload/", response_model=FileUploadResponse)
async def upload_file(
    _current_user: CurrentUser,
    file: UploadFile,
    folder: str = Form("omega/"),
) -> Any:
    """
    Proxy-upload a small file (≤ chunk_threshold) via backend to MinIO.
    """
    content = await file.read()
    file_size = len(content)

    if file_size > settings.MINIO_CHUNK_THRESHOLD:
        raise BusinessException(
            msg=f"File too large for proxy upload ({file_size} bytes). "
            f"Use multipart upload for files > {settings.MINIO_CHUNK_THRESHOLD} bytes.",
            code=400,
        )

    if file_size > settings.MINIO_MAX_FILE_SIZE:
        raise BusinessException(
            msg=f"File exceeds maximum allowed size ({settings.MINIO_MAX_FILE_SIZE} bytes).",
            code=400,
        )

    original_name = file.filename or "untitled"
    object_path = generate_object_path(folder, original_name)
    content_type = file.content_type or "application/octet-stream"

    client = get_minio_client()
    client.put_object(
        bucket_name=settings.MINIO_BUCKET_NAME,
        object_name=object_path,
        data=io.BytesIO(content),
        length=file_size,
        content_type=content_type,
    )

    return FileUploadResponse(
        file_path=object_path,
        file_name=original_name,
        file_size=file_size,
    )


# ─── 3. Multipart Upload (large files) ─────────────────────────────────────


@router.post("/upload/multipart/init", response_model=MultipartInitResponse)
async def init_multipart_upload(
    _current_user: CurrentUser,
    body: MultipartInitRequest,
) -> Any:
    """
    Initialize an S3 multipart upload.
    Returns an upload_id and presigned PUT URLs for each part.
    """
    if body.file_size > settings.MINIO_MAX_FILE_SIZE:
        raise BusinessException(
            msg=f"File exceeds maximum allowed size ({settings.MINIO_MAX_FILE_SIZE} bytes).",
            code=400,
        )

    object_path = generate_object_path(body.folder, body.file_name)
    client = get_minio_client()

    # Create multipart upload — returns upload_id
    upload_id = client._create_multipart_upload(
        bucket_name=settings.MINIO_BUCKET_NAME,
        object_name=object_path,
        headers={},
    )

    # Generate presigned PUT URL for each part
    num_parts = calculate_parts(body.file_size, settings.MINIO_CHUNK_SIZE)
    parts: list[PartInfo] = []
    for part_num in range(1, num_parts + 1):
        url = client.get_presigned_url(
            method="PUT",
            bucket_name=settings.MINIO_BUCKET_NAME,
            object_name=object_path,
            extra_query_params={
                "partNumber": str(part_num),
                "uploadId": upload_id,
            },
        )
        parts.append(
            PartInfo(part_number=part_num, upload_url=to_public_minio_url(url))
        )

    return MultipartInitResponse(
        upload_id=upload_id,
        file_path=object_path,
        file_name=body.file_name,
        parts=parts,
    )


@router.post("/upload/multipart/complete", response_model=FileUploadResponse)
async def complete_multipart_upload(
    _current_user: CurrentUser,
    body: MultipartCompleteRequest,
) -> Any:
    """
    Complete a multipart upload — instructs MinIO to assemble all parts.
    """
    client = get_minio_client()

    # Build the parts list expected by MinIO
    from minio.datatypes import Part

    minio_parts = [
        Part(part_number=p.part_number, etag=p.etag)
        for p in sorted(body.parts, key=lambda x: x.part_number)
    ]

    client._complete_multipart_upload(
        bucket_name=settings.MINIO_BUCKET_NAME,
        object_name=body.file_path,
        upload_id=body.upload_id,
        parts=minio_parts,
    )

    # Get actual file size after assembly
    stat = client.stat_object(
        bucket_name=settings.MINIO_BUCKET_NAME,
        object_name=body.file_path,
    )

    return FileUploadResponse(
        file_path=body.file_path,
        file_name=body.file_name,
        file_size=stat.size or 0,
    )


@router.post("/upload/multipart/abort")
async def abort_multipart_upload(
    _current_user: CurrentUser,
    body: MultipartAbortRequest,
) -> Any:
    """
    Abort a multipart upload — cleans up already-uploaded parts.
    """
    client = get_minio_client()
    client._abort_multipart_upload(
        bucket_name=settings.MINIO_BUCKET_NAME,
        object_name=body.file_path,
        upload_id=body.upload_id,
    )
    return {"message": "Multipart upload aborted"}


# ─── 4. File Proxy (download) ──────────────────────────────────────────────


def _guess_content_type(file_path: str) -> str:
    lower_file_path = file_path.lower()
    for suffix, content_type in OFFICE_CONTENT_TYPES.items():
        if lower_file_path.endswith(suffix):
            return content_type

    content_type, _ = mimetypes.guess_type(file_path)
    return content_type or "application/octet-stream"


def _parse_range_header(range_header: str | None, file_size: int) -> tuple[int, int] | None:
    if not range_header:
        return None
    if not range_header.startswith("bytes=") or "," in range_header:
        raise BusinessException(msg="Invalid range header", code=416)

    start_text, separator, end_text = range_header.removeprefix("bytes=").partition("-")
    if separator != "-":
        raise BusinessException(msg="Invalid range header", code=416)

    try:
        if start_text:
            start = int(start_text)
            end = int(end_text) if end_text else file_size - 1
        else:
            suffix_length = int(end_text)
            if suffix_length <= 0:
                raise ValueError
            start = max(file_size - suffix_length, 0)
            end = file_size - 1
    except ValueError:
        raise BusinessException(msg="Invalid range header", code=416)

    if start < 0 or start >= file_size or end < start:
        raise BusinessException(msg="Invalid range header", code=416)

    return start, min(end, file_size - 1)


def _stream_minio_response(resp):
    try:
        if hasattr(resp, "stream"):
            for chunk in resp.stream(32 * 1024):
                if chunk:
                    yield chunk
        else:
            while True:
                chunk = resp.read(32 * 1024)
                if not chunk:
                    break
                yield chunk
    finally:
        if hasattr(resp, "close"):
            resp.close()
        if hasattr(resp, "release_conn"):
            resp.release_conn()


def _file_proxy_response(file_path: str, request: Request) -> StreamingResponse:
    client = get_minio_client()

    try:
        stat = client.stat_object(
            bucket_name=settings.MINIO_BUCKET_NAME,
            object_name=file_path,
        )
    except Exception:
        raise BusinessException(msg="File not found", code=404)

    file_size = stat.size or 0
    content_type = _guess_content_type(file_path)
    filename = file_path.rsplit("/", 1)[-1]
    encoded_filename = quote(filename)
    range_value = _parse_range_header(request.headers.get("range"), file_size)

    status_code = 200
    content_length = file_size
    headers = {
        "Accept-Ranges": "bytes",
        "Content-Disposition": f"inline; filename*=UTF-8''{encoded_filename}",
        "Content-Length": str(content_length),
    }

    offset = 0
    length = 0
    if range_value:
        start, end = range_value
        offset = start
        length = end - start + 1
        status_code = 206
        content_length = length
        headers["Content-Length"] = str(content_length)
        headers["Content-Range"] = f"bytes {start}-{end}/{file_size}"

    if request.method == "HEAD":
        return StreamingResponse(
            content=iter(()),
            status_code=status_code,
            media_type=content_type,
            headers=headers,
        )

    try:
        response = client.get_object(
            bucket_name=settings.MINIO_BUCKET_NAME,
            object_name=file_path,
            offset=offset,
            length=length,
        )
    except Exception:
        raise BusinessException(msg="File not found", code=404)

    return StreamingResponse(
        content=_stream_minio_response(response),
        status_code=status_code,
        media_type=content_type,
        headers=headers,
    )


@router.get("/proxy/{file_path:path}")
@router.head("/proxy/{file_path:path}", include_in_schema=False)
async def proxy_file(
    _current_user: CurrentUserForFileProxy,
    file_path: str,
    request: Request,
) -> StreamingResponse:
    """
    Stream a file from MinIO through the backend (authenticated).
    """
    return _file_proxy_response(file_path, request)


@public_router.get("/public-proxy/{file_path:path}")
@public_router.head("/public-proxy/{file_path:path}", include_in_schema=False)
async def public_proxy_file(
    file_path: str,
    request: Request,
) -> StreamingResponse:
    """
    Stream a file from MinIO without authentication.
    For external services (AI, etc.) that need file access.
    """
    return _file_proxy_response(file_path, request)
