import { createFileRoute } from "@tanstack/react-router";
import * as zod from "zod";

const iframeSearchSchema = zod.object({
	url: zod.string().catch(""),
});

export const Route = createFileRoute("/_layout/iframe")({
	validateSearch: iframeSearchSchema,
	component: IframePage,
});

function IframePage() {
	const { url } = Route.useSearch();

	if (!url) {
		return (
			<div className="flex h-full w-full items-center justify-center p-8 text-muted-foreground">
				无效的内嵌页面地址
			</div>
		);
	}

	return (
		<div className="h-full w-full">
			<iframe
				src={url}
				title="内嵌页面"
				className="h-full w-full border-0"
				sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
			/>
		</div>
	);
}
