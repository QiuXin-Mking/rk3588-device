/**
 * Orval custom fetch mutator.
 *
 * Returns { data, status, headers } to match orval's fetch httpClient response types.
 *
 * - BASE_URL  via VITE_API_URL env var
 * - Token     via swappable getter (supports non-localStorage sources)
 * - Errors    thrown with .status property — handled upstream by QueryClient.onError
 */

let _tokenGetter: () => string | null = () =>
	localStorage.getItem("access_token");

export const setTokenGetter = (fn: () => string | null) => {
	_tokenGetter = fn;
};

let _workspaceIdGetter: () => string | null = () =>
	localStorage.getItem("workspace_id");

export const setWorkspaceIdGetter = (fn: () => string | null) => {
	_workspaceIdGetter = fn;
};

export type FetchResponse<T> = {
	data: T;
	status: number;
	headers: Headers;
};

export const customFetch = async <T>(
	url: string,
	options: RequestInit = {},
): Promise<T> => {
	const token = _tokenGetter();
	const workspaceId = _workspaceIdGetter();
	const BASE_URL = import.meta.env.VITE_API_URL ?? "";

	const response = await fetch(`${BASE_URL}${url}`, {
		...options,
		headers: {
			...(!(options.body instanceof URLSearchParams) &&
				!(options.body instanceof FormData) && {
					"Content-Type": "application/json",
				}),
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...(workspaceId ? { "X-Workspace-Id": workspaceId } : {}),
			...(options.headers as Record<string, string>),
		},
	});

	if (!response.ok) {
		let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
		try {
			const errorData = await response.json();
			if (errorData?.detail) {
				if (typeof errorData.detail === "string") {
					errorDetail = errorData.detail;
				} else if (
					Array.isArray(errorData.detail) &&
					errorData.detail.length > 0
				) {
					// Flatten FastAPI validation errors (e.g., "[body -> email] field required")
					errorDetail = errorData.detail[0].msg || errorDetail;
				}
			}
		} catch {
			// Ignore JSON parse errors for non-JSON responses
		}

		const error = new Error(errorDetail) as Error & { status: number };
		error.status = response.status;
		throw error;
	}

	const contentType = response.headers.get("content-type") ?? "";
	const data =
		response.status === 204
			? undefined
			: contentType.includes("application/json")
				? await response.json()
				: await response.text();

	return { data, status: response.status, headers: response.headers } as T;
};
