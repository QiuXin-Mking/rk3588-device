import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { toast } from "sonner";
import { useLoginLoginAccessToken } from "@/api/login/login";
import { useSystemUsersReadUserMe } from "@/api/system-users/system-users";
import { useSystemWorkspacesReadWorkspacesMe } from "@/api/system-workspaces/system-workspaces";
import { clearAuthSession, isLoggedIn } from "@/lib/auth-session";

const storeToken = (token: string) =>
	localStorage.setItem("access_token", token);

const AUTH_STALE_TIME_MS = 5 * 60 * 1000;

function readWorkspaceId(): string | null {
	return localStorage.getItem("workspace_id");
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [, bumpWorkspaceRevision] = React.useReducer(
		(count: number) => count + 1,
		0,
	);

	const updateWorkspaceId = React.useCallback(
		(wsId: string) => {
			const previousWorkspaceId = readWorkspaceId();
			if (previousWorkspaceId === wsId) {
				return;
			}
			localStorage.setItem("workspace_id", wsId);
			bumpWorkspaceRevision();
			queryClient.invalidateQueries();
		},
		[queryClient],
	);

	const { data: userResponse } = useSystemUsersReadUserMe({
		query: {
			enabled: isLoggedIn(),
			staleTime: AUTH_STALE_TIME_MS,
		},
	});

	const user = userResponse?.status === 200 ? userResponse.data : null;

	const { data: workspacesResponse, isLoading: workspacesLoading } =
		useSystemWorkspacesReadWorkspacesMe({
			query: {
				enabled: isLoggedIn() && user !== null,
				staleTime: AUTH_STALE_TIME_MS,
			},
		});

	const workspaces =
		workspacesResponse?.status === 200 ? workspacesResponse.data.data : [];

	const singleWorkspaceId = React.useMemo(() => {
		if (workspaces.length !== 1) {
			return null;
		}
		return workspaces[0].workspace.id ?? null;
	}, [workspaces]);

	React.useEffect(() => {
		if (user === null || workspacesLoading || !singleWorkspaceId) {
			return;
		}
		if (readWorkspaceId() === singleWorkspaceId) {
			return;
		}
		updateWorkspaceId(singleWorkspaceId);
	}, [user, workspacesLoading, singleWorkspaceId, updateWorkspaceId]);

	const activeWorkspaceId = readWorkspaceId();

	const requiresWorkspaceSelection = React.useMemo(() => {
		if (user === null || workspacesLoading || workspaces.length <= 1) {
			return false;
		}
		const hasValidSelection = workspaces.some(
			(w) => w.workspace.id === activeWorkspaceId,
		);
		return !hasValidSelection;
	}, [user, workspacesLoading, workspaces, activeWorkspaceId]);

	const switchWorkspace = React.useCallback(
		(workspaceId: string) => {
			updateWorkspaceId(workspaceId);
		},
		[updateWorkspaceId],
	);

	const loginMutation = useLoginLoginAccessToken({
		mutation: {
			onSuccess: (result) => {
				if (result.status === 200) {
					storeToken(result.data.access_token);
				}
			},
			onError: (err: unknown) => {
				const status = (err as { status?: number }).status;
				if (status === 400 || status === 401) {
					toast.error("Incorrect username or password.");
				} else {
					toast.error("Login failed. Please try again.");
				}
			},
		},
	});

	const logout = React.useCallback(() => {
		clearAuthSession();
		queryClient.clear();
		navigate({ to: "/login" });
	}, [navigate, queryClient]);

	return {
		loginMutation,
		logout,
		user,
		workspaces,
		workspacesLoading,
		requiresWorkspaceSelection,
		switchWorkspace,
	};
}
