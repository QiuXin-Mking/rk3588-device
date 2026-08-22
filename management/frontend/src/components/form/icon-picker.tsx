import * as Icons from "lucide-react";
import { ChevronsUpDown, Search, X } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function isLucideIconComponent(value: unknown): value is React.ElementType {
	return typeof value === "object" && value !== null && "render" in value;
}

const ALL_ICONS = Object.entries(Icons)
	.filter(
		([iconName, value]) => iconName !== "Icon" && isLucideIconComponent(value),
	)
	.map(([iconName]) => iconName)
	.sort();

interface IconPickerProps {
	value?: string;
	onChange?: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
}

export function IconPicker({
	value,
	onChange,
	placeholder = "选择图标...",
	disabled,
}: IconPickerProps) {
	const [open, setOpen] = React.useState(false);
	const [searchQuery, setSearchQuery] = React.useState("");
	const [scrollTop, setScrollTop] = React.useState(0);
	const listRef = React.useRef<HTMLDivElement | null>(null);
	const itemHeight = 40;
	const listHeight = 240;
	const columns = 5;
	const overscanRows = 3;

	const filteredIcons = React.useMemo(() => {
		if (!searchQuery) return ALL_ICONS;
		const q = searchQuery.toLowerCase();
		return ALL_ICONS.filter((icon) => icon.toLowerCase().includes(q));
	}, [searchQuery]);

	const totalRows = Math.ceil(filteredIcons.length / columns);
	const visibleStartRow = Math.max(
		0,
		Math.floor(scrollTop / itemHeight) - overscanRows,
	);
	const visibleEndRow = Math.min(
		totalRows,
		Math.ceil((scrollTop + listHeight) / itemHeight) + overscanRows,
	);
	const visibleStartIndex = visibleStartRow * columns;
	const visibleEndIndex = Math.min(
		filteredIcons.length,
		visibleEndRow * columns,
	);
	const visibleIcons = filteredIcons.slice(visibleStartIndex, visibleEndIndex);
	const topSpacer = visibleStartRow * itemHeight;
	const bottomSpacer = Math.max(0, (totalRows - visibleEndRow) * itemHeight);

	// Render the selected icon or a default placeholder icon
	const SelectedIcon =
		value && isLucideIconComponent(Icons[value as keyof typeof Icons])
			? (Icons[value as keyof typeof Icons] as React.ElementType)
			: null;

	React.useEffect(() => {
		if (!open) {
			setScrollTop(0);
		}
	}, [open]);

	return (
		<div className="relative">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						role="combobox"
						aria-expanded={open}
						disabled={disabled}
						className={cn(
							"w-full justify-between font-normal",
							value && !disabled && "pr-8",
						)}
					>
						<span className="flex items-center gap-2 truncate">
							{SelectedIcon ? (
								<SelectedIcon className="size-4 shrink-0" />
							) : null}
							{value || placeholder}
						</span>
						<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				{value && !disabled && (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="absolute right-1 top-1/2 z-10 size-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						aria-label="清除图标"
						onClick={(event) => {
							event.preventDefault();
							event.stopPropagation();
							onChange?.("");
						}}
					>
						<X className="size-3.5" />
					</Button>
				)}
				<PopoverContent className="w-[300px] p-2" align="start">
					<div className="flex items-center border-b px-2 pb-2">
						<Search className="mr-2 size-4 shrink-0 opacity-50" />
						<Input
							placeholder="搜索图标..."
							value={searchQuery}
							onChange={(e) => {
								setSearchQuery(e.target.value);
								setScrollTop(0);
								listRef.current?.scrollTo({ top: 0 });
							}}
							className="hidden md:flex h-8 w-full border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
						/>
						{/* Fallback standard input for mobile or overriding */}
						<input
							placeholder="搜索图标..."
							value={searchQuery}
							onChange={(e) => {
								setSearchQuery(e.target.value);
								setScrollTop(0);
								listRef.current?.scrollTo({ top: 0 });
							}}
							className="flex md:hidden h-8 w-full border-0 bg-transparent p-0 shadow-none focus-visible:outline-none"
						/>
					</div>
					<div
						ref={listRef}
						className="h-[240px] overflow-y-auto pt-2 pr-2"
						onScroll={(event) => {
							setScrollTop(event.currentTarget.scrollTop);
						}}
						onWheel={(event) => {
							event.currentTarget.scrollTop += event.deltaY;
							setScrollTop(event.currentTarget.scrollTop);
						}}
					>
						{filteredIcons.length === 0 ? (
							<div className="py-6 text-center text-sm text-muted-foreground">
								未找到图标
							</div>
						) : (
							<div className="grid grid-cols-5 gap-1">
								{topSpacer > 0 ? (
									<div
										aria-hidden="true"
										className="col-span-5"
										style={{ height: topSpacer }}
									/>
								) : null}
								{visibleIcons.map((iconName) => {
									const IconCmp = Icons[iconName as keyof typeof Icons] as
										| React.ElementType
										| undefined;
									if (!isLucideIconComponent(IconCmp)) return null;

									return (
										<Button
											key={iconName}
											variant="ghost"
											size="icon"
											className={cn(
												"size-9",
												value === iconName &&
													"bg-accent text-accent-foreground",
											)}
											onClick={() => {
												onChange?.(iconName);
												setOpen(false);
												setSearchQuery("");
											}}
											title={iconName}
										>
											<IconCmp className="size-4" />
										</Button>
									);
								})}
								{bottomSpacer > 0 ? (
									<div
										aria-hidden="true"
										className="col-span-5"
										style={{ height: bottomSpacer }}
									/>
								) : null}
							</div>
						)}
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
