import type { MenuTreeNode } from "@/api/schemas";
import { useMenuTree } from "@/hooks/use-menu-tree";
import { isLoggedIn } from "@/lib/auth-session";
import { collectMenuRoutePaths } from "@/lib/menu-route-path";
import { useAuth } from "./use-auth";

export function usePermissions() {
	const { user, workspaces } = useAuth();

	// We use the same cached query that the Layout uses
	const { data: menuResponse, isLoading: menusLoading } = useMenuTree(!!user);

	const codes = new Set<string>();
	const paths = new Set<string>();

	if (menuResponse?.status === 200 && menuResponse.data) {
		const traverse = (nodes: MenuTreeNode[]) => {
			for (const node of nodes) {
				if (node.permission_code) {
					codes.add(node.permission_code);
				}
				if (node.children && node.children.length > 0) {
					traverse(node.children as MenuTreeNode[]);
				}
			}
		};
		traverse(menuResponse.data as MenuTreeNode[]);
		for (const routePath of collectMenuRoutePaths(
			menuResponse.data as MenuTreeNode[],
		)) {
			paths.add(routePath);
		}
	}

	const permissionCodes = codes;
	const routePaths = paths;

	const hasPermission = (code?: string): boolean => {
		// Root user logic bypasses all checks
		if (user?.is_root) return true;

		// Workspace admin bypasses workspace-level checks
		const currentWorkspaceId = localStorage.getItem("workspace_id");
		const currentWorkspace = workspaces.find(
			(w) => w.workspace.id === currentWorkspaceId,
		)?.workspace;
		if (
			currentWorkspace &&
			user?.username === `admin-${currentWorkspace.name}`
		) {
			return true;
		}

		// If a component asks for permission check but passes undefined/falsy code,
		// assume it means "no permission required" or "globally allowed"
		if (!code) return true;

		// Exact match
		if (permissionCodes.has(code)) return true;

		// Wildcard match: check if any owned permission like 'abc:*' covers 'abc:read'
		for (const perm of permissionCodes) {
			if (perm === "*") return true;
			if (perm.endsWith(":*")) {
				const prefix = perm.slice(0, -1); // 'abc:*' -> 'abc:'
				if (code.startsWith(prefix)) return true;
			}
		}

		return false;
	};

	const canAccessRoute = (currentPath: string): boolean => {
		// Root user logic bypasses all checks
		if (user?.is_root) return true;

		// Workspace admin bypasses workspace-level checks
		const currentWorkspaceId = localStorage.getItem("workspace_id");
		const currentWorkspace = workspaces.find(
			(w) => w.workspace.id === currentWorkspaceId,
		)?.workspace;
		if (
			currentWorkspace &&
			user?.username === `admin-${currentWorkspace.name}`
		) {
			return true;
		}

		// Unprotected global routes
		const unprotectedPrefixes = ["/login", "/403", "/404"];
		for (const prefix of unprotectedPrefixes) {
			if (currentPath.startsWith(prefix)) return true;
		}

		// Exact match checking first
		if (routePaths.has(currentPath)) return true;

		// Prefix matching for dynamic child routes (e.g. currentPath="/roles/123", routePath="/roles")
		for (const path of Array.from(routePaths)) {
			// Ensure it matches cleanly. e.g. path `/roles` should match `/roles/xx` but NOT `/roles-group/xx`
			if (currentPath.startsWith(`${path}/`) || currentPath === path) {
				return true;
			}
		}

		return false;
	};

	return {
		hasPermission,
		canAccessRoute,
		isLoading: isLoggedIn() && (!user || menusLoading),
	};
}
