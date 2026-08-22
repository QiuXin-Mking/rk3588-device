const BASE_URL = () => import.meta.env.VITE_API_URL ?? "";

export type DownloadParamValue = string | number | boolean | null | undefined;
export type DownloadParams = Record<
	string,
	DownloadParamValue | DownloadParamValue[]
>;

function buildUrl(path: string, params?: DownloadParams): string {
	const base = BASE_URL().replace(/\/$/, "");
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	const url = new URL(`${base}${normalizedPath}`, window.location.origin);

	for (const [key, value] of Object.entries(params ?? {})) {
		if (value === undefined || value === null || value === "") continue;
		if (Array.isArray(value)) {
			for (const item of value) {
				if (item === undefined || item === null || item === "") continue;
				url.searchParams.append(key, String(item));
			}
			continue;
		}
		url.searchParams.set(key, String(value));
	}

	if (base.startsWith("http://") || base.startsWith("https://")) {
		return url.toString();
	}
	return `${url.pathname}${url.search}`;
}

function authHeaders(): HeadersInit {
	const token = localStorage.getItem("access_token");
	const workspaceId = localStorage.getItem("workspace_id");
	return {
		...(token ? { Authorization: `Bearer ${token}` } : {}),
		...(workspaceId ? { "X-Workspace-Id": workspaceId } : {}),
	};
}

function errorMessage(payload: unknown, fallback: string): string {
	if (!payload || typeof payload !== "object") return fallback;

	const data = payload as Record<string, unknown>;
	if (typeof data.detail === "string" && data.detail) return data.detail;
	if (Array.isArray(data.detail) && data.detail.length > 0) {
		const first = data.detail[0];
		if (first && typeof first === "object") {
			const detail = first as Record<string, unknown>;
			if (typeof detail.msg === "string" && detail.msg) return detail.msg;
		}
	}
	if (typeof data.message === "string" && data.message) return data.message;

	const error = data.error;
	if (error && typeof error === "object") {
		const detail = error as Record<string, unknown>;
		if (typeof detail.message === "string" && detail.message) {
			return detail.message;
		}
		if (typeof detail.detail === "string" && detail.detail) {
			return detail.detail;
		}
	}
	return fallback;
}

function filenameFromDisposition(disposition: string): string | undefined {
	const filename = /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i.exec(
		disposition,
	);
	if (filename?.[1]) return decodeURIComponent(filename[1]);
	return filename?.[2];
}

export async function downloadAuthenticatedBlob(
	path: string,
	params?: DownloadParams,
): Promise<{ blob: Blob; filename?: string }> {
	const response = await fetch(buildUrl(path, params), {
		headers: authHeaders(),
	});
	if (!response.ok) {
		const contentType = response.headers.get("content-type") ?? "";
		if (contentType.includes("application/json")) {
			const payload = await response.json().catch(() => null);
			throw new Error(errorMessage(payload, `HTTP ${response.status}`));
		}
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	return {
		blob: await response.blob(),
		filename: filenameFromDisposition(
			response.headers.get("content-disposition") ?? "",
		),
	};
}

export function downloadBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}
