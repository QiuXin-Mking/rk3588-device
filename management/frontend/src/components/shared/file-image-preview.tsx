import { ImageIcon } from "lucide-react";
import { useMemo, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { getPublicFileProxyUrl } from "@/lib/upload";
import { cn } from "@/lib/utils";

function isImagePath(value: string) {
	return (
		/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(value) || /^https?:\/\//i.test(value)
	);
}

function resolveImageSrc(filePath: string) {
	if (/^https?:\/\//i.test(filePath)) return filePath;
	return getPublicFileProxyUrl(filePath);
}

export function FileImagePreview({
	filePath,
	alt = "image preview",
	className,
}: {
	filePath: string | null | undefined;
	alt?: string;
	className?: string;
}) {
	const [broken, setBroken] = useState(false);
	const [open, setOpen] = useState(false);

	const { fileName, showImage, previewUrl } = useMemo(() => {
		const value = filePath?.trim() ?? "";
		return {
			fileName: value.split("/").pop() || value,
			showImage: value ? isImagePath(value) : false,
			previewUrl: value ? resolveImageSrc(value) : "",
		};
	}, [filePath]);

	if (!filePath || !showImage || broken) {
		return (
			<div
				className={cn(
					"flex size-12 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground",
					className,
				)}
				title={fileName || alt}
			>
				<ImageIcon className="size-5" />
			</div>
		);
	}

	return (
		<>
			<button
				type="button"
				className={cn(
					"block size-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted cursor-zoom-in",
					className,
				)}
				title={fileName || alt}
				onClick={() => setOpen(true)}
			>
				<img
					src={previewUrl}
					alt={alt}
					className="size-full object-cover"
					onError={() => setBroken(true)}
				/>
			</button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-[min(92vw,1100px)] gap-3 p-4 sm:max-w-[min(92vw,1100px)]">
					<DialogHeader className="gap-1 pr-10">
						<DialogTitle className="text-sm">{fileName || alt}</DialogTitle>
						<DialogDescription className="text-xs">
							点击遮罩层或右上角关闭
						</DialogDescription>
					</DialogHeader>
					<div className="flex max-h-[80vh] items-center justify-center overflow-hidden rounded-lg bg-black/5">
						<img
							src={previewUrl}
							alt={alt}
							className="max-h-[80vh] max-w-full object-contain"
							onError={() => setBroken(true)}
						/>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
