import { ArrowLeft } from "lucide-react";
import { FilterInput, FilterRadioGroup } from "@/components/filters";
import { BrandSidebarHeader } from "@/components/layout";
import {
	SidebarContent as ShadcnSidebarContent,
	Sidebar,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
} from "@/components/ui/sidebar";

interface WorkspaceMemberSidebarContentProps {
	filters: {
		job_number?: string;
		sex?: string;
		mobile?: string;
	};
	onFilterChange: (key: string, value: string) => void;
	onBack?: () => void;
}

export function WorkspaceMemberSidebarContent({
	filters,
	onFilterChange,
	onBack,
}: WorkspaceMemberSidebarContentProps) {
	return (
		<Sidebar>
			<SidebarHeader className="border-b space-y-2">
				<BrandSidebarHeader />
				<div className="flex items-center justify-between">
					{onBack && (
						<button
							type="button"
							onClick={onBack}
							className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
						>
							<ArrowLeft className="h-3 w-3" />
							返回
						</button>
					)}
					<div className="text-sm font-semibold">高级筛选</div>
				</div>
			</SidebarHeader>
			<ShadcnSidebarContent>
				<SidebarGroup>
					<SidebarGroupContent className="p-2 space-y-6">
						<div className="space-y-4">
							<FilterInput
								searchIcon
								filterKey="job_number"
								label="工号"
								filters={filters as Record<string, string>}
								onFilterChange={onFilterChange}
							/>

							<FilterInput
								searchIcon
								filterKey="mobile"
								label="手机号"
								filters={filters as Record<string, string>}
								onFilterChange={onFilterChange}
							/>

							<FilterRadioGroup
								filterKey="sex"
								label="性别"
								filters={filters as Record<string, string>}
								onFilterChange={onFilterChange}
								options={[
									{ label: "不限", value: "all" },
									{ label: "男", value: "男" },
									{ label: "女", value: "女" },
								]}
							/>
						</div>
					</SidebarGroupContent>
				</SidebarGroup>
			</ShadcnSidebarContent>
		</Sidebar>
	);
}
