import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { CalendarIcon, X } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { FilterValue } from "./types";

dayjs.extend(utc);
dayjs.extend(timezone);

export interface FilterDateRangePickerProps {
	label?: string;
	gte?: FilterValue;
	lte?: FilterValue;
	onChange: (gte: string | undefined, lte: string | undefined) => void;
	className?: string;
	includeTime?: boolean;
	timeZone?: string;
}

function pickerDate(value: string | undefined, timeZone: string | undefined) {
	if (!value) return undefined;
	return timeZone ? dayjs.tz(value, timeZone).toDate() : dayjs(value).toDate();
}

function pickerDateText(date: Date, timeZone: string | undefined) {
	return timeZone
		? dayjs(date).tz(timeZone).format("YYYY-MM-DD")
		: dayjs(date).format("YYYY-MM-DD");
}

function pickerTimeText(value: string | undefined, fallback: string) {
	const time = value?.split("T")[1];
	return time?.slice(0, 8) || fallback;
}

export function FilterDateRangePicker({
	label,
	gte,
	lte,
	onChange,
	className,
	includeTime = false,
	timeZone,
}: FilterDateRangePickerProps) {
	const gteValue = typeof gte === "string" ? gte : undefined;
	const lteValue = typeof lte === "string" ? lte : undefined;
	const hasDate = Boolean(gteValue || lteValue);

	const [open, setOpen] = React.useState(false);
	const [date, setDate] = React.useState<DateRange | undefined>({
		from: pickerDate(gteValue, timeZone),
		to: pickerDate(lteValue, timeZone),
	});
	const [startTime, setStartTime] = React.useState(() =>
		pickerTimeText(gteValue, "00:00:00"),
	);
	const [endTime, setEndTime] = React.useState(() =>
		pickerTimeText(lteValue, "23:59:59"),
	);
	const startTimeId = React.useId();
	const endTimeId = React.useId();
	const displayDate = open
		? date
		: {
				from: pickerDate(gteValue, timeZone),
				to: pickerDate(lteValue, timeZone),
			};
	const displayStartTime = open
		? startTime
		: pickerTimeText(gteValue, "00:00:00");
	const displayEndTime = open ? endTime : pickerTimeText(lteValue, "23:59:59");

	const handleOpenChange = (nextOpen: boolean) => {
		if (nextOpen) {
			setDate({
				from: pickerDate(gteValue, timeZone),
				to: pickerDate(lteValue, timeZone),
			});
			setStartTime(pickerTimeText(gteValue, "00:00:00"));
			setEndTime(pickerTimeText(lteValue, "23:59:59"));
		}
		setOpen(nextOpen);
	};

	const applyTimeRange = () => {
		if (!date?.from || !date.to) return;
		onChange(
			`${pickerDateText(date.from, timeZone)}T${startTime}`,
			`${pickerDateText(date.to, timeZone)}T${endTime}`,
		);
		setOpen(false);
	};
	const invalidTimeRange = Boolean(
		date?.from &&
			date.to &&
			pickerDateText(date.from, timeZone) ===
				pickerDateText(date.to, timeZone) &&
			startTime > endTime,
	);

	return (
		<div className={cn("grid gap-2", className)}>
			{label && (
				<Label className="text-muted-foreground mb-1 block">{label}</Label>
			)}
			<div className="relative">
				<Popover open={open} onOpenChange={handleOpenChange}>
					<PopoverTrigger asChild>
						<Button
							id="date"
							variant={"outline"}
							className={cn(
								"w-full justify-start text-left font-normal",
								(displayDate?.from || displayDate?.to) && "pr-8",
								!displayDate?.from &&
									!displayDate?.to &&
									"text-muted-foreground",
							)}
						>
							<CalendarIcon data-icon="inline-start" />
							{displayDate?.from ? (
								displayDate.to ? (
									includeTime ? (
										<>
											{pickerDateText(displayDate.from, timeZone)}{" "}
											{displayStartTime} -{" "}
											{pickerDateText(displayDate.to, timeZone)}{" "}
											{displayEndTime}
										</>
									) : (
										<>
											{pickerDateText(displayDate.from, timeZone)} -{" "}
											{pickerDateText(displayDate.to, timeZone)}
										</>
									)
								) : (
									pickerDateText(displayDate.from, timeZone)
								)
							) : (
								<span>选择日期范围...</span>
							)}
						</Button>
					</PopoverTrigger>
					{hasDate && (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="absolute right-1 top-1/2 z-10 size-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
							aria-label={`清除${label ?? "日期范围"}`}
							onPointerDown={(event) => {
								event.preventDefault();
								event.stopPropagation();
								setDate(undefined);
								setStartTime("00:00:00");
								setEndTime("23:59:59");
								onChange(undefined, undefined);
							}}
						>
							<X className="size-3.5" />
						</Button>
					)}
					<PopoverContent className="w-auto p-0" align="start">
						<Calendar
							initialFocus
							mode="range"
							timeZone={timeZone}
							defaultMonth={date?.from}
							selected={date}
							onSelect={(newDate) => {
								setDate(newDate);
								if (includeTime) return;
								if (newDate?.from && newDate?.to) {
									onChange(
										pickerDateText(newDate.from, timeZone),
										pickerDateText(newDate.to, timeZone),
									);
								} else if (newDate?.from && !newDate?.to) {
									onChange(pickerDateText(newDate.from, timeZone), undefined);
								} else {
									onChange(undefined, undefined);
								}
							}}
							numberOfMonths={2}
						/>
						{includeTime && (
							<>
								<Separator />
								<div className="flex items-end gap-3 p-3">
									<div className="flex flex-1 flex-col gap-1">
										<Label htmlFor={startTimeId}>开始时间</Label>
										<Input
											id={startTimeId}
											type="time"
											step="1"
											value={startTime}
											onChange={(event) => setStartTime(event.target.value)}
										/>
									</div>
									<div className="flex flex-1 flex-col gap-1">
										<Label htmlFor={endTimeId}>结束时间</Label>
										<Input
											id={endTimeId}
											type="time"
											step="1"
											value={endTime}
											onChange={(event) => setEndTime(event.target.value)}
										/>
									</div>
									<Button
										type="button"
										onClick={applyTimeRange}
										disabled={!date?.from || !date.to || invalidTimeRange}
									>
										确定
									</Button>
								</div>
							</>
						)}
					</PopoverContent>
				</Popover>
			</div>
		</div>
	);
}
