/**
 * FormFileUpload — TanStack Form field for file uploads.
 *
 * Thin wrapper matching the shared form component pattern.
 * The form field value is the MinIO `file_path` string.
 *
 * Features:
 * - Drag & drop or click to select
 * - Automatic strategy selection (proxy vs multipart)
 * - Upload progress bar
 * - Preview for images
 * - Remove / replace uploaded file
 */

import { FileUp, Trash2, Upload } from "lucide-react";
import { type DragEvent, useRef, useState } from "react";
import { extractErrors } from "@/lib/form-errors";
import {
	formatSize,
	getPublicFileProxyUrl,
	type UploadOptions,
	type UploadResult,
	uploadFile,
} from "@/lib/upload";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Progress } from "../ui/progress";
import type { AnyFieldApi, FormFieldBaseProps } from "./types";

export function FormFileUpload<TFormData>({
	form,
	name,
	label,
	required,
	disabled,
	className,
	folder = "omega/",
	accept,
	maxSize,
}: FormFieldBaseProps<TFormData> & {
	/** Storage folder in MinIO, default "omega/" */
	folder?: string;
	/** Allowed file extensions, e.g. [".jpg", ".png", ".pdf"] */
	accept?: string[];
	/** Max file size in bytes. If not set, uses server config. */
	maxSize?: number;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);
	const [progress, setProgress] = useState(0);
	const [dragOver, setDragOver] = useState(false);
	const [fileName, setFileName] = useState<string | null>(null);
	const [uploadError, setUploadError] = useState<string | null>(null);

	const handleUpload = async (
		file: File,
		field: AnyFieldApi<TFormData, typeof name>,
	) => {
		// Validate extension
		if (accept && accept.length > 0) {
			const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
			if (!accept.includes(ext)) {
				setUploadError(`不支持的文件格式，允许：${accept.join(", ")}`);
				return;
			}
		}

		// Validate size
		if (maxSize && file.size > maxSize) {
			setUploadError(`文件大小超过限制 (${formatSize(maxSize)})`);
			return;
		}

		setUploadError(null);
		setUploading(true);
		setProgress(0);

		const options: UploadOptions = {
			folder,
			onProgress: (pct) => setProgress(pct),
		};

		try {
			const result: UploadResult = await uploadFile(file, options);
			// biome-ignore lint/suspicious/noExplicitAny: Required for TanStack Form
			field.handleChange(result.file_path as any);
			setFileName(result.file_name);
		} catch (err) {
			const msg = err instanceof Error ? err.message : "上传失败";
			setUploadError(msg);
		} finally {
			setUploading(false);
		}
	};

	const handleDrop = (
		e: DragEvent,
		field: AnyFieldApi<TFormData, typeof name>,
	) => {
		e.preventDefault();
		setDragOver(false);
		const file = e.dataTransfer.files[0];
		if (file) handleUpload(file, field);
	};

	const handleDragOver = (e: DragEvent) => {
		e.preventDefault();
		setDragOver(true);
	};

	const handleDragLeave = () => setDragOver(false);

	return (
		<form.Field name={name}>
			{(field: AnyFieldApi<TFormData, typeof name>) => {
				const errors = extractErrors(field.state.meta.errors);
				const allErrors = uploadError
					? [...errors, { message: uploadError }]
					: errors;
				const invalid = allErrors.length > 0;
				const filePath = field.state.value as string | null;
				const isImage =
					filePath && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(filePath);

				return (
					<Field data-invalid={invalid} className={className}>
						<FieldLabel htmlFor={`field-${String(name)}`}>
							{label}
							{required && <span className="text-destructive"> *</span>}
						</FieldLabel>

						{filePath ? (
							// ── Uploaded state ──
							<div className="flex min-w-0 items-center gap-3 overflow-hidden rounded-md border border-border bg-muted/30 p-3">
								{isImage ? (
									<img
										src={getPublicFileProxyUrl(filePath)}
										alt={fileName ?? "preview"}
										className="h-16 w-16 shrink-0 rounded-md object-cover"
									/>
								) : (
									<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-muted">
										<FileUp className="h-6 w-6 text-muted-foreground" />
									</div>
								)}
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium">
										{fileName ?? filePath.split("/").pop()}
									</p>
									<p className="text-xs text-muted-foreground">上传完成</p>
								</div>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="shrink-0"
									onClick={() => {
										// biome-ignore lint/suspicious/noExplicitAny: Required for TanStack Form
										field.handleChange(null as any);
										setFileName(null);
										setProgress(0);
									}}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						) : (
							// ── Drop zone ──
							// biome-ignore lint/a11y/noStaticElementInteractions: Drop zone click is delegated to input
							<div
								className={cn(
									"flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 transition-colors",
									dragOver
										? "border-primary bg-primary/5"
										: "border-border hover:border-primary/50 hover:bg-muted/30",
									uploading && "pointer-events-none opacity-60",
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
								<Upload className="h-8 w-8 text-muted-foreground" />
								<div className="text-center">
									<p className="text-sm font-medium">
										拖拽文件到此处，或点击选择
									</p>
									{accept && (
										<p className="text-xs text-muted-foreground">
											支持格式：{accept.join(", ")}
										</p>
									)}
								</div>

								{uploading && (
									<div className="w-full max-w-xs space-y-1">
										<Progress value={progress} />
										<p className="text-center text-xs text-muted-foreground">
											{progress}%
										</p>
									</div>
								)}

								<input
									ref={inputRef}
									id={`field-${String(name)}`}
									type="file"
									className="hidden"
									accept={accept?.join(",")}
									onChange={(e) => {
										const file = e.target.files?.[0];
										if (file) handleUpload(file, field);
										e.target.value = "";
									}}
								/>
							</div>
						)}

						<FieldError errors={allErrors} />
					</Field>
				);
			}}
		</form.Field>
	);
}
