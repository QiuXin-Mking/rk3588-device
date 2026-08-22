import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";

export function RouteGuard({ children }: { children: ReactNode }) {
	const { canAccessRoute, isLoading } = usePermissions();
	const pathname = useRouterState({ select: (s) => s.location.pathname });

	// By default, unprotected routes like "/" should pass through,
	// or we can strictly enforce that even "/" requires no permissions or bypassing.
	// Since our routing logic puts main logic inside sub-routes (/workspaces, /roles etc),
	// if the path is exactly "/", we allow it.
	const isAllowed = pathname === "/" || canAccessRoute(pathname);

	if (isLoading) {
		return (
			<div className="flex h-screen w-screen items-center justify-center bg-background">
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Loader2 className="h-4 w-4 animate-spin" />
					正在加载权限...
				</div>
			</div>
		);
	}

	if (!isAllowed) {
		return (
			<div className="flex h-screen w-screen flex-col items-center justify-center p-6 bg-background">
				<div className="flex flex-col items-center max-w-md text-center p-8 bg-muted/20 border rounded-xl shadow-sm">
					<div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4 border shadow-sm">
						<Lock className="h-8 w-8 text-muted-foreground" />
					</div>
					<h2 className="text-xl font-semibold tracking-tight mb-2">
						无权访问该页面
					</h2>
					<p className="text-sm text-muted-foreground mb-6">
						您目前的角色未获授权访问{" "}
						<code className="bg-muted px-1.5 py-0.5 rounded border text-primary font-mono">
							{pathname}
						</code>
						<br />
						如需访问，请联系管理员为您分配相应的菜单权限。
					</p>
					<Button asChild variant="outline">
						<Link to="/">
							<ArrowLeft className="mr-2 h-4 w-4" />
							返回首页
						</Link>
					</Button>
				</div>
			</div>
		);
	}

	return <>{children}</>;
}
