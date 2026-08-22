/**
 * FormMultiFileUpload — TanStack Form field for multiple file uploads.
 *
 * The form field value is a string of comma-separated MinIO `file_path`s.
 *
 * Features:
 * - Drag & drop or click to select multiple files
 * - Parallel upload progress bars
 * - Shows an ongoing list of files plus a drop zone
 * - Remove individual uploaded files
 */

import { AlertCircle, FileUp, Paperclip, Trash2, Upload } from "lucide-react";
import { type DragEvent, useRef, useState } from "react";
import { extractErrors } from "@/lib/form-errors";
import { makeUuid } from "@/lib/id";
import {
	formatSize,
	getPublicFileProxyUrl,
	type UploadOptions,
	uploadFile,
} from "@/lib/upload";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Progress } from "../ui/progress";
import { FieldHint } from "./field-hint";
import type { AnyFieldApi, FormFieldBaseProps } from "./types";

interface OngoingUpload {
	id: string;
	name: string;
	progress: number;
	error: string | null;
}

export function FormMultiFileUpload<TFormData>({
	form,
	name,
	label,
	required,
	disabled,
	className,
	folder = "omega/",
	accept,
	maxSize,
	tooltip,
}: FormFieldBaseProps<TFormData> & {
	/** Storage folder in MinIO, default "omega/" */
	folder?: string;
	/** Allowed file extensions, e.g. [".jpg", ".png", ".pdf"] */
	accept?: string[];
	/** Max file size in bytes per file. If not set, uses server config. */
	maxSize?: number;
	tooltip?: string;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [dragOver, setDragOver] = useState(false);
	const [ongoingUploads, setOngoingUploads] = useState<OngoingUpload[]>([]);

	const handleUploadBatch = async (
		files: File[],
		field: AnyFieldApi<TFormData, typeof name>,
	) => {
		const newUploads = files.map((file) => ({
			id: makeUuid(),
			file,
			name: file.name,
			progress: 0,
			error: null as string | null,
		}));

		// Validate items synchronously before inserting into UI state
		for (const u of newUploads) {
			if (accept && accept.length > 0) {
				const ext = `.${u.name.split(".").pop()?.toLowerCase()}`;
				if (!accept.includes(ext)) {
					u.error = `不支持格式，允许：${accept.join(", ")}`;
				}
			}
			if (!u.error && maxSize && u.file.size > maxSize) {
				u.error = `超大限制 (${formatSize(maxSize)})`;
			}
		}

		setOngoingUploads((prev) => [...prev, ...newUploads]);

		// Kick off independent uploads
		for (const u of newUploads) {
			if (u.error) continue; // Skip uploading if failed validation

			const options: UploadOptions = {
				folder,
				onProgress: (pct) => {
					setOngoingUploads((prev) =>
						prev.map((item) =>
							item.id === u.id ? { ...item, progress: pct } : item,
						),
					);
				},
			};

			try {
				const result = await uploadFile(u.file, options);

				// Upon success, append to form state, then remove from ongoing array
				const currentVal = field.state.value as string | null;
				const currentList = currentVal
					? currentVal.split(",").filter(Boolean)
					: [];
				field.handleChange([...currentList, result.file_path].join(","));

				setOngoingUploads((prev) => prev.filter((item) => item.id !== u.id));
			} catch (err) {
				const msg = err instanceof Error ? err.message : "上传失败";
				setOngoingUploads((prev) =>
					prev.map((item) =>
						item.id === u.id ? { ...item, error: msg } : item,
					),
				);
			}
		}
	};

	const handleDrop = (
		e: DragEvent,
		field: AnyFieldApi<TFormData, typeof name>,
	) => {
		e.preventDefault();
		setDragOver(false);
		const files = Array.from(e.dataTransfer.files);
		if (files.length > 0) handleUploadBatch(files, field);
	};

	const handleDragOver = (e: DragEvent) => {
		e.preventDefault();
		setDragOver(true);
	};

	const handleDragLeave = () => setDragOver(false);

	const removeOngoing = (id: string) => {
		setOngoingUploads((prev) => prev.filter((x) => x.id !== id));
	};

	const removeUploaded = (
		path: string,
		field: AnyFieldApi<TFormData, typeof name>,
	) => {
		const currentVal = field.state.value as string | null;
		if (!currentVal) return;
		const currentList = currentVal.split(",").filter(Boolean);
		const newList = currentList.filter((p) => p !== path);
		field.handleChange(newList.length > 0 ? newList.join(",") : null);
	};

	return (
		<form.Field name={name}>
			{(field: AnyFieldApi<TFormData, typeof name>) => {
				const fieldErrors = extractErrors(field.state.meta.errors);
				const invalid = fieldErrors.length > 0;

				const valueStr = field.state.value as string | null;
				const uploadedList = valueStr
					? valueStr.split(",").filter(Boolean)
					: [];

				return (
					<Field data-invalid={invalid} className={cn("min-w-0", className)}>
						<FieldLabel htmlFor={`field-${String(name)}`}>
							{label}
							{required && <span className="text-destructive"> *</span>}
							{tooltip && <FieldHint text={tooltip} />}
						</FieldLabel>

						<div className="flex min-w-0 flex-col gap-3">
							{/* ── Drop zone ── */}
							{/* biome-ignore lint/a11y/noStaticElementInteractions: Drop zone click is delegated to input */}
							<div
								className={cn(
									"flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-4 transition-colors",
									dragOver
										? "border-primary bg-primary/5"
										: "border-border hover:border-primary/50 hover:bg-muted/30",
									disabled && "pointer-events-none opacity-50",
								)}
								onDrop={(e) => handleDrop(e, field)}
								onDragOver={handleDragOver}
								onDragLeave={handleDragLeave}
								onClick={() => inputRef.current?.click()}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ")
										inputRef.current?.click();
								}}
							>
								<Upload className="h-6 w-6 text-muted-foreground mb-1" />
								<div className="text-center">
									<p className="text-sm font-medium">拖拽或点此选择多份文件</p>
									{accept && (
										<p className="text-xs text-muted-foreground mt-1">
											支持格式：{accept.join(", ")}
										</p>
									)}
								</div>

								<input
									ref={inputRef}
									id={`field-${String(name)}`}
									type="file"
									className="hidden"
									multiple
									accept={accept?.join(",")}
									onChange={(e) => {
										const files = Array.from(e.target.files || []);
										if (files.length > 0) handleUploadBatch(files, field);
										e.target.value = "";
									}}
								/>
							</div>

							{/* ── Uploaded Items List ── */}
							{(uploadedList.length > 0 || ongoingUploads.length > 0) && (
								<div className="flex min-w-0 flex-col gap-2 overflow-hidden rounded-md bg-muted/20 p-2">
									{/* Complete items */}
									{uploadedList.map((filePath) => {
										const fileName = filePath.split("/").pop() || filePath;
										const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(
											filePath,
										);

										return (
											<div
												key={filePath}
												className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-md border bg-background px-3 py-2"
											>
												{isImage ? (
													<a
														href={getPublicFileProxyUrl(filePath)}
														target="_blank"
														rel="noreferrer"
														className="shrink-0"
													>
														<img
															src={getPublicFileProxyUrl(filePath)}
															alt={fileName}
															className="h-10 w-10 shrink-0 rounded object-cover border"
														/>
													</a>
												) : (
													<a
														href={getPublicFileProxyUrl(filePath)}
														target="_blank"
														rel="noreferrer"
														className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted hover:bg-muted/80 transition-colors"
													>
														<FileUp className="h-4 w-4 text-muted-foreground" />
													</a>
												)}
												<div className="min-w-0 flex-1">
													<a
														href={getPublicFileProxyUrl(filePath)}
														target="_blank"
														rel="noreferrer"
														className="block truncate text-sm font-medium hover:underline hover:text-primary"
													>
														{fileName}
													</a>
													<p className="text-xs text-muted-foreground mt-0.5">
														上传完成
													</p>
												</div>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="shrink-0 text-muted-foreground hover:text-destructive"
													onClick={() => removeUploaded(filePath, field)}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										);
									})}

									{/* Ongoing items */}
									{ongoingUploads.map((item) => (
										<div
											key={item.id}
											className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-md border border-dashed bg-muted/30 px-3 py-2"
										>
											<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted/50 border">
												{item.error ? (
													<AlertCircle className="h-4 w-4 text-destructive" />
												) : (
													<Paperclip className="h-4 w-4 text-muted-foreground/60" />
												)}
											</div>
											<div className="min-w-0 flex-1 py-1">
												<p className="truncate text-sm font-medium text-foreground/80">
													{item.name}
												</p>
												{item.error ? (
													<p className="text-xs text-destructive mt-0.5">
														{item.error}
													</p>
												) : (
													<div className="flex items-center gap-2 mt-1">
														<Progress
															value={item.progress}
															className="h-1.5 flex-1"
														/>
														<span className="text-[10px] tabular-nums text-muted-foreground w-6 text-right">
															{item.progress}%
														</span>
													</div>
												)}
											</div>
											{item.error && (
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="shrink-0 text-muted-foreground hover:text-destructive"
													onClick={() => removeOngoing(item.id)}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											)}
										</div>
									))}
								</div>
							)}
						</div>

						<FieldError errors={fieldErrors} />
					</Field>
				);
			}}
		</form.Field>
	);
}
