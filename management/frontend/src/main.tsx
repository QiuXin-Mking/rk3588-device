import {
	MutationCache,
	QueryCache,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import { Toaster, toast } from "sonner";
import { clearAuthSession } from "./lib/auth-session";
import { initZodI18n } from "./lib/zod-i18n";
import { routeTree } from "./routeTree.gen";

initZodI18n();

const handleGlobalError = (error: unknown) => {
	const err = error as Error & { status?: number };
	const pathname = window.location.pathname;

	if (err.status === 401) {
		if (pathname === "/login") {
			return;
		}
		clearAuthSession();
		queryClient.clear();
		router.navigate({ to: "/login", replace: true });
		toast.error("身份过期或无权限", {
			description: err.message,
			id: "auth-error",
		});
		return;
	}

	if (err.status === 403) {
		toast.error("身份过期或无权限", {
			description: err.message,
			id: "auth-error",
		});
	} else if (err.status && err.status >= 500) {
		toast.error("系统故障", {
			description: "服务器发生未知错误，请联系技术支持。",
			id: "server-error",
		});
	} else {
		toast.error("操作失败", { description: err.message });
	}
};

const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: handleGlobalError,
	}),
	mutationCache: new MutationCache({
		onError: handleGlobalError,
	}),
});

const router = createRouter({
	routeTree,
	context: { queryClient },
	defaultPreload: "intent",
	scrollRestoration: true,
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

if (!rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
			<ReactQueryDevtools initialIsOpen={false} />
			<Toaster richColors closeButton />
		</QueryClientProvider>,
	);
}
