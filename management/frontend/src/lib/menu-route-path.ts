import type { MenuTreeNode } from "@/api/schemas";

export function buildMenuRoutePath(
	parentPath: string,
	currentPath: string | null | undefined,
): string {
	if (!currentPath) return parentPath || "";
	if (currentPath.startsWith("http")) return parentPath || "";

	const cleanParent = parentPath.replace(/\/+$/, "");
	const cleanCurrent = currentPath.replace(/^\/+/, "").replace(/\/+$/, "");

	if (!cleanCurrent) return cleanParent || "/";
	if (!cleanParent) return `/${cleanCurrent}`;

	return `${cleanParent}/${cleanCurrent}`;
}

export function collectMenuRoutePaths(nodes: MenuTreeNode[]): Set<string> {
	const paths = new Set<string>();

	const traverse = (menuNodes: MenuTreeNode[], parentPath = "") => {
		for (const node of menuNodes) {
			if (node.type === 4) {
				paths.add("/iframe");
			} else if (
				node.type !== 3 &&
				node.path &&
				!node.path.startsWith("http")
			) {
				const fullPath = buildMenuRoutePath(parentPath, node.path);
				if (fullPath) {
					paths.add(fullPath);
				}
			}

			const childParentPath =
				node.path && !node.path.startsWith("http") && node.type !== 4
					? buildMenuRoutePath(parentPath, node.path)
					: parentPath;

			if (node.children && node.children.length > 0) {
				traverse(node.children as MenuTreeNode[], childParentPath);
			}
		}
	};

	traverse(nodes);
	return paths;
}
