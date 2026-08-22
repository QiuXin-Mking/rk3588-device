import type { ReactNode } from "react";
import { usePermissions } from "@/hooks/use-permissions";

interface AuthGuardProps {
	code: string;
	children: ReactNode;
}

export function AuthGuard({ code, children }: AuthGuardProps) {
	const { hasPermission } = usePermissions();

	if (!hasPermission(code)) {
		return null;
	}

	return <>{children}</>;
}
