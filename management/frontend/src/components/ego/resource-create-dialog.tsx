import { useForm } from "@tanstack/react-form";
import { Check, ChevronsUpDown, Loader2, Plus, Trash2, X } from "lucide-react";
import { type HTMLInputTypeAttribute, useEffect, useState } from "react";
import { FormFileUpload } from "@/components/form/form-file-upload";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface ResourceCreateField {
	name: string;
	label: string;
	placeholder?: string;
	required?: boolean;
	multiline?: boolean;
	multilineRows?: number;
	repeatable?: boolean;
	fullWidth?: boolean;
	options?: Array<{ label: string; value: string }>;
	searchable?: boolean;
	loadOptions?: (
		query: string,
	) => Promise<Array<{ label: string; value: string }>>;
	type?: HTMLInputTypeAttribute;
	file?: {
		accept?: string[];
		folder?: string;
		maxSize?: number;
	};
}

export function resourceFormValues(
	item: object,
	fields: ResourceCreateField[],
): Record<string, string> {
	const record = item as Record<string, unknown>;
	return Object.fromEntries(
		fields.map((field) => [
			field.name,
			record[field.name] == null ? "" : String(record[field.name]),
		]),
	);
}

interface ResourceCreateDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	fields: ResourceCreateField[];
	isPending: boolean;
	onSubmit: (values: Record<string, string>) => Promise<void>;
	initialValues?: Record<string, string>;
	columns?: 1 | 2;
}

export function ResourceCreateDialog({
	open,
	onOpenChange,
	title,
	description,
	fields,
	isPending,
	onSubmit,
	initialValues,
	columns = 1,
}: ResourceCreateDialogProps) {
	const defaults = Object.fromEntries(
		fields.map((field) => [field.name, initialValues?.[field.name] ?? ""]),
	) as Record<string, string>;
	const form = useForm({
		defaultValues: defaults,
		onSubmit: async ({ value }) => onSubmit(value),
	});
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className={cn("p-0", columns === 2 ? "sm:max-w-3xl" : "sm:max-w-xl")}
			>
				<form
					action={() => form.handleSubmit()}
					className="flex max-h-[calc(100vh-2rem)] min-h-0 flex-col overflow-hidden"
				>
					<DialogHeader className="shrink-0 px-5 pt-5 pr-10">
						<DialogTitle>{title}</DialogTitle>
						<DialogDescription>{description}</DialogDescription>
					</DialogHeader>
					<ScrollArea className="min-h-0 flex-1">
						<FieldGroup
							className={cn(
								"p-5",
								columns === 2 && "grid grid-cols-1 md:grid-cols-2",
							)}
						>
							{fields.map((field) =>
								field.file ? (
									<FormFileUpload
										key={field.name}
										form={form}
										name={field.name}
										label={field.label}
										required={field.required}
										disabled={isPending}
										accept={field.file.accept}
										folder={field.file.folder}
										maxSize={field.file.maxSize}
									/>
								) : (
									<form.Field key={field.name} name={field.name}>
										{(formField) => (
											<Field
												className={cn(
													columns === 2 && field.fullWidth && "md:col-span-2",
												)}
											>
												<FieldLabel htmlFor={`create-${field.name}`}>
													{field.label}
												</FieldLabel>
												{field.searchable &&
												(field.options || field.loadOptions) ? (
													<SearchableResourceCombobox
														id={`create-${field.name}`}
														field={field}
														value={formField.state.value}
														onChange={formField.handleChange}
													/>
												) : field.options ? (
													<Select
														value={formField.state.value || undefined}
														onValueChange={formField.handleChange}
													>
														<SelectTrigger
															id={`create-${field.name}`}
															className="w-full"
														>
															<SelectValue
																placeholder={
																	field.placeholder ?? `请选择${field.label}`
																}
															/>
														</SelectTrigger>
														<SelectContent>
															<SelectGroup>
																{field.options.map((option) => (
																	<SelectItem
																		key={option.value}
																		value={option.value}
																	>
																		{option.label}
																	</SelectItem>
																))}
															</SelectGroup>
														</SelectContent>
													</Select>
												) : field.repeatable ? (
													<RepeatableTextInput
														id={`create-${field.name}`}
														value={formField.state.value}
														onChange={formField.handleChange}
														placeholder={field.placeholder}
														required={field.required}
													/>
												) : field.multiline ? (
													<Textarea
														id={`create-${field.name}`}
														value={formField.state.value}
														onChange={(event) =>
															formField.handleChange(event.target.value)
														}
														placeholder={field.placeholder}
														required={field.required}
														rows={field.multilineRows}
													/>
												) : (
													<Input
														id={`create-${field.name}`}
														value={formField.state.value}
														onChange={(event) =>
															formField.handleChange(event.target.value)
														}
														placeholder={field.placeholder}
														required={field.required}
														type={field.type}
													/>
												)}
											</Field>
										)}
									</form.Field>
								),
							)}
						</FieldGroup>
					</ScrollArea>
					<DialogFooter className="shrink-0 px-5 pb-5">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							取消
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending && <Loader2 className="animate-spin" />}保存
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

type ResourceOption = { label: string; value: string };

function mergeOptions(...groups: ResourceOption[][]) {
	return [
		...new Map(
			groups.flat().map((option) => [option.value, option] as const),
		).values(),
	];
}

function SearchableResourceCombobox({
	id,
	field,
	value,
	onChange,
}: {
	id: string;
	field: ResourceCreateField;
	value: string;
	onChange: (value: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [remoteOptions, setRemoteOptions] = useState<ResourceOption[]>([]);
	const [loading, setLoading] = useState(false);
	const options = mergeOptions(
		value ? [{ value, label: value }] : [],
		field.options ?? [],
		remoteOptions,
	);
	const selectedOption = options.find((option) => option.value === value);
	const normalizedQuery = query.trim().toLocaleLowerCase();
	const visibleOptions = normalizedQuery
		? options.filter((option) =>
				option.label.toLocaleLowerCase().includes(normalizedQuery),
			)
		: options;

	useEffect(() => {
		if (!field.loadOptions) return;
		let active = true;
		const timer = window.setTimeout(async () => {
			setLoading(true);
			try {
				const loaded = await field.loadOptions?.(query.trim());
				if (active) setRemoteOptions(loaded ?? []);
			} finally {
				if (active) setLoading(false);
			}
		}, 250);
		return () => {
			active = false;
			window.clearTimeout(timer);
		};
	}, [field.loadOptions, query]);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<div className="flex min-w-0 gap-1">
				<PopoverTrigger asChild>
					<Button
						id={id}
						type="button"
						variant="outline"
						role="combobox"
						aria-expanded={open}
						className="min-w-0 flex-1 justify-between font-normal"
					>
						<span className="truncate">
							{selectedOption?.label ??
								field.placeholder ??
								`搜索并选择${field.label}`}
						</span>
						<ChevronsUpDown className="shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				{value ? (
					<Button
						type="button"
						variant="outline"
						size="icon"
						aria-label={`清除${field.label}`}
						onClick={() => onChange("")}
					>
						<X />
					</Button>
				) : null}
			</div>
			<PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-72 p-2">
				<Input
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder={`搜索${field.label}`}
					aria-label={`搜索${field.label}`}
					autoFocus
				/>
				<div className="mt-2 max-h-64 overflow-y-auto">
					{loading ? (
						<p className="px-2 py-4 text-center text-muted-foreground text-xs">
							搜索中…
						</p>
					) : visibleOptions.length ? (
						visibleOptions.map((option) => (
							<Button
								key={option.value}
								type="button"
								variant="ghost"
								role="option"
								aria-selected={option.value === value}
								className="w-full justify-start"
								onClick={() => {
									onChange(option.value);
									setQuery("");
									setOpen(false);
								}}
							>
								<Check
									className={cn(
										"shrink-0",
										option.value === value ? "opacity-100" : "opacity-0",
									)}
								/>
								<span className="truncate">{option.label}</span>
							</Button>
						))
					) : (
						<p className="px-2 py-4 text-center text-muted-foreground text-xs">
							没有匹配项
						</p>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}

function RepeatableTextInput({
	id,
	value,
	onChange,
	placeholder,
	required,
}: {
	id: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	required?: boolean;
}) {
	const items = parseRepeatableValue(value);
	const update = (next: string[]) => onChange(JSON.stringify(next));
	return (
		<FieldGroup className="gap-2">
			{items.map((item, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: the position is the identity of each ordered subtask input.
				<Field key={`${id}-${index}`} orientation="horizontal">
					<Input
						id={index === 0 ? id : `${id}-${index + 1}`}
						aria-label={`子任务 ${index + 1}`}
						value={item}
						onChange={(event) => {
							const next = [...items];
							next[index] = event.target.value;
							update(next);
						}}
						placeholder={placeholder}
						required={required}
					/>
					<Button
						type="button"
						variant="outline"
						size="icon"
						disabled={items.length === 1}
						onClick={() =>
							update(items.filter((_, itemIndex) => itemIndex !== index))
						}
						aria-label={`删除子任务 ${index + 1}`}
					>
						<Trash2 />
					</Button>
				</Field>
			))}
			<Button
				type="button"
				variant="outline"
				className="w-fit"
				onClick={() => update([...items, ""])}
			>
				<Plus data-icon="inline-start" />
				添加子任务
			</Button>
		</FieldGroup>
	);
}

function parseRepeatableValue(value: string): string[] {
	if (!value) return [""];
	try {
		const parsed = JSON.parse(value);
		if (Array.isArray(parsed)) return parsed.map(String);
	} catch {
		// Existing single-value fields become the first repeatable item.
	}
	return [value];
}
