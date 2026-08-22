import { useSystemMenusReadMenusTreeMe } from "@/api/system-menus/system-menus";

const MENU_TREE_STALE_TIME_MS = 5 * 60 * 1000;

export function useMenuTree(enabled = true) {
	return useSystemMenusReadMenusTreeMe({
		query: {
			enabled,
			staleTime: MENU_TREE_STALE_TIME_MS,
		},
	});
}
