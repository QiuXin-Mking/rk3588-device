import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { copyTextToClipboard } from "@/lib/copy-text";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
	text?: string | null;
	label?: string;
	className?: string;
	successMessage?: string;
}

export function CopyButton({
	text,
	label = "复制",
	className,
	successMessage = "已复制",
}: CopyButtonProps) {
	const handleCopy = async () => {
		if (!text) return;
		const ok = await copyTextToClipboard(text);
		if (ok) {
			toast.success(successMessage);
		} else {
			toast.error("复制失败");
		}
	};

	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			className={cn("shrink-0", className)}
			aria-label={label}
			title={label}
			disabled={!text}
			onClick={handleCopy}
		>
			<Copy className="size-4" />
		</Button>
	);
}
