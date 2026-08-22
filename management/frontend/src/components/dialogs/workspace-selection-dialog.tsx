import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";

export function WorkspaceSelectionDialog() {
	const { requiresWorkspaceSelection, workspaces, switchWorkspace } = useAuth();

	// Open state strictly follows whether selection is required
	const open = requiresWorkspaceSelection;

	if (!workspaces || workspaces.length === 0) return null;

	return (
		<Dialog open={open}>
			<DialogContent
				className="sm:max-w-[425px]"
				onPointerDownOutside={(e) => e.preventDefault()}
				onEscapeKeyDown={(e) => e.preventDefault()}
				showCloseButton={false}
			>
				<DialogHeader>
					<DialogTitle>选择工作区</DialogTitle>
					<DialogDescription>
						您属于多个工作区。请选择您想要进入的工作区。
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					{workspaces.map((item) => (
						<button
							key={item.workspace.id}
							type="button"
							onClick={() =>
								item.workspace.id && switchWorkspace(item.workspace.id)
							}
							className="flex items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring"
						>
							<Avatar className="size-10 rounded-lg">
								<AvatarImage src={item.workspace.logo || undefined} />
								<AvatarFallback className="rounded-lg">
									{item.workspace.name.substring(0, 2).toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<div className="flex-1 space-y-1">
								<p className="font-medium text-sm leading-none">
									{item.workspace.name}
								</p>
								<p className="text-muted-foreground text-sm">
									员工身份: {item.member_info.employee_name || "未知"}
								</p>
							</div>
						</button>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}
