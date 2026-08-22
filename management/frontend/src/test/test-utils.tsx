/**
 * 测试工具：为 Vitest Browser Mode 提供统一的 Provider 包装。
 * 所有需要 QueryClient / Router 的组件测试都应使用 customRender。
 *
 * 用法:
 *   import { customRender } from "@/test/test-utils"
 *   const screen = await customRender(<MyComponent />)
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { render } from "vitest-browser-react";

function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
}

function TestProviders({ children }: { children: ReactNode }) {
	const queryClient = createTestQueryClient();
	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

export function customRender(ui: ReactNode) {
	return render(ui, { wrapper: TestProviders });
}
