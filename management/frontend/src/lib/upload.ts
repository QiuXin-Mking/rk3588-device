/**
 * File upload utility with automatic strategy selection.
 *
 * - Small files (≤ threshold): proxy upload via backend
 * - Large files (> threshold): S3 multipart upload with presigned URLs
 *
 * Usage:
 *   const result = await uploadFile(file, { folder: "uploads/" });
 *   console.log(result.file_path); // "uploads/2026/04/uuid.jpg"
 */

const BASE_URL = () => import.meta.env.VITE_API_URL ?? "";
const API_PREFIX = "/api/v1/files";

function getAuthHeaders(): Record<string, string> {
	const token = localStorage.getItem("access_token");
	const workspaceId = localStorage.getItem("workspace_id");
	return {
		...(token ? { Authorization: `Bearer ${token}` } : {}),
		...(workspaceId ? { "X-Workspace-Id": workspaceId } : {}),
	};
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface UploadConfig {
	chunk_threshold: number;
	chunk_size: number;
	max_file_size: number;
}

export interface UploadResult {
	file_path: string;
	file_name: string;
	file_size: number;
}

export interface UploadOptions {
	folder?: string;
	onProgress?: (percent: number) => void;
	signal?: AbortSignal;
}

interface MultipartInitResponse {
	upload_id: string;
	file_path: string;
	file_name: string;
	parts: { part_number: number; upload_url: string }[];
}

// ─── Config Cache ──────────────────────────────────────────────────────────

let _cachedConfig: UploadConfig | null = null;

export async function getUploadConfig(): Promise<UploadConfig> {
	if (_cachedConfig) return _cachedConfig;

	const res = await fetch(`${BASE_URL()}${API_PREFIX}/config`, {
		headers: getAuthHeaders(),
	});
	if (!res.ok) throw new Error("Failed to fetch upload config");
	const config = await res.json();
	_cachedConfig = config;
	return config;
}

// ─── Main Upload Function ──────────────────────────────────────────────────

export async function uploadFile(
	file: File,
	options: UploadOptions = {},
): Promise<UploadResult> {
	const config = await getUploadConfig();

	if (file.size > config.max_file_size) {
		throw new Error(
			`文件大小 (${formatSize(file.size)}) 超过上限 (${formatSize(config.max_file_size)})`,
		);
	}

	if (file.size <= config.chunk_threshold) {
		return proxyUpload(file, options);
	}
	return multipartUpload(file, config, options);
}

// ─── Proxy Upload (small files) ────────────────────────────────────────────

async function proxyUpload(
	file: File,
	options: UploadOptions,
): Promise<UploadResult> {
	const formData = new FormData();
	formData.append("file", file);
	if (options.folder) {
		formData.append("folder", options.folder);
	}

	const xhr = new XMLHttpRequest();

	return new Promise((resolve, reject) => {
		xhr.upload.addEventListener("progress", (e) => {
			if (e.lengthComputable && options.onProgress) {
				options.onProgress(Math.round((e.loaded / e.total) * 100));
			}
		});

		xhr.addEventListener("load", () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				resolve(JSON.parse(xhr.responseText));
			} else {
				reject(new Error(`Upload failed: ${xhr.statusText}`));
			}
		});

		xhr.addEventListener("error", () => reject(new Error("Upload failed")));
		xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

		if (options.signal) {
			options.signal.addEventListener("abort", () => xhr.abort());
		}

		xhr.open("POST", `${BASE_URL()}${API_PREFIX}/upload/`);
		const headers = getAuthHeaders();
		for (const [key, value] of Object.entries(headers)) {
			xhr.setRequestHeader(key, value);
		}
		xhr.send(formData);
	});
}

// ─── Multipart Upload (large files) ────────────────────────────────────────

const CONCURRENT_UPLOADS = 4;

async function multipartUpload(
	file: File,
	config: UploadConfig,
	options: UploadOptions,
): Promise<UploadResult> {
	// 1. Init
	const initRes = await fetch(
		`${BASE_URL()}${API_PREFIX}/upload/multipart/init`,
		{
			method: "POST",
			headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
			body: JSON.stringify({
				file_name: file.name,
				file_size: file.size,
				folder: options.folder ?? "uploads/",
			}),
			signal: options.signal,
		},
	);
	if (!initRes.ok) throw new Error("Failed to initialize multipart upload");
	const initData: MultipartInitResponse = await initRes.json();

	// 2. Upload parts concurrently
	const partETags: { part_number: number; etag: string }[] = [];
	const completedParts = new Set<number>();
	let aborted = false;

	const uploadPart = async (part: {
		part_number: number;
		upload_url: string;
	}) => {
		if (aborted) return;

		const start = (part.part_number - 1) * config.chunk_size;
		const end = Math.min(start + config.chunk_size, file.size);
		const chunk = file.slice(start, end);

		const res = await fetch(part.upload_url, {
			method: "PUT",
			body: chunk,
			signal: options.signal,
		});

		if (!res.ok) throw new Error(`Failed to upload part ${part.part_number}`);

		const etag = res.headers.get("ETag");
		if (!etag) throw new Error(`Missing ETag for part ${part.part_number}`);

		partETags.push({ part_number: part.part_number, etag });
		completedParts.add(part.part_number);

		if (options.onProgress) {
			options.onProgress(
				Math.round((completedParts.size / initData.parts.length) * 100),
			);
		}
	};

	// Process parts in batches of CONCURRENT_UPLOADS
	try {
		const parts = [...initData.parts];
		while (parts.length > 0) {
			const batch = parts.splice(0, CONCURRENT_UPLOADS);
			await Promise.all(batch.map(uploadPart));
		}
	} catch (err) {
		aborted = true;
		// Abort the multipart upload on failure
		await fetch(`${BASE_URL()}${API_PREFIX}/upload/multipart/abort`, {
			method: "POST",
			headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
			body: JSON.stringify({
				upload_id: initData.upload_id,
				file_path: initData.file_path,
			}),
		}).catch(() => {});
		throw err;
	}

	// 3. Complete
	const completeRes = await fetch(
		`${BASE_URL()}${API_PREFIX}/upload/multipart/complete`,
		{
			method: "POST",
			headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
			body: JSON.stringify({
				upload_id: initData.upload_id,
				file_path: initData.file_path,
				file_name: file.name,
				parts: partETags.sort((a, b) => a.part_number - b.part_number),
			}),
			signal: options.signal,
		},
	);
	if (!completeRes.ok) throw new Error("Failed to complete multipart upload");
	return completeRes.json();
}

// ─── Helpers ───────────────────────────────────────────────────────────────

export function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024)
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function getFileProxyUrl(filePath: string): string {
	const encoded = filePath
		.split("/")
		.map((s) => encodeURIComponent(s))
		.join("/");
	return `${BASE_URL()}${API_PREFIX}/proxy/${encoded}`;
}

/** Proxy URL with access_token query param for browser tab preview/download. */
export function getAuthenticatedFileProxyUrl(filePath: string): string {
	const url = getFileProxyUrl(filePath);
	const token = localStorage.getItem("access_token");
	if (!token) {
		return url;
	}
	const separator = url.includes("?") ? "&" : "?";
	return `${url}${separator}access_token=${encodeURIComponent(token)}`;
}

function isBrowserPreviewable(filePath: string, contentType: string): boolean {
	if (contentType.startsWith("image/") || contentType === "application/pdf") {
		return true;
	}
	return /\.(pdf|png|jpe?g|gif|webp|svg)$/i.test(filePath);
}

/** Fetch with auth; preview PDF/images in a new tab, otherwise download. */
export async function openOrDownloadAuthenticatedFile(
	filePath: string,
): Promise<void> {
	const response = await fetch(getFileProxyUrl(filePath), {
		headers: getAuthHeaders(),
	});
	if (!response.ok) {
		let message = `HTTP ${response.status}: ${response.statusText}`;
		try {
			const data = (await response.json()) as { detail?: string };
			if (typeof data.detail === "string") {
				message = data.detail;
			}
		} catch {
			// Non-JSON error body
		}
		throw new Error(message);
	}

	const contentType =
		response.headers.get("content-type")?.split(";")[0]?.trim() ??
		"application/octet-stream";
	const blob = await response.blob();
	const typedBlob = blob.type ? blob : new Blob([blob], { type: contentType });
	const objectUrl = URL.createObjectURL(typedBlob);
	const fileName = filePath.split("/").pop() || "download";

	if (isBrowserPreviewable(filePath, contentType)) {
		window.open(objectUrl, "_blank", "noopener,noreferrer");
		window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
		return;
	}

	const anchor = document.createElement("a");
	anchor.href = objectUrl;
	anchor.download = fileName;
	anchor.click();
	window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export function getPublicFileProxyUrl(filePath: string): string {
	const encoded = filePath
		.split("/")
		.map((s) => encodeURIComponent(s))
		.join("/");
	return `${BASE_URL()}${API_PREFIX}/public-proxy/${encoded}`;
}
