import dayjs from "dayjs";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export interface FilterDatePresetProps {
	gte?: string;
	lte?: string;
	onChange: (gte: string | undefined, lte: string | undefined) => void;
}

function sameDay(value: string | undefined, expected: dayjs.Dayjs) {
	return value ? dayjs(value).isSame(expected, "day") : false;
}

export function FilterDatePreset({
	gte,
	lte,
	onChange,
}: FilterDatePresetProps) {
	let activeTab = "全部时间";
	if (gte) {
		const now = dayjs();
		const weekStart = now.day(now.day() === 0 ? -6 : 1).startOf("day");
		const monthStart = now.startOf("month");
		const lastMonthStart = now.subtract(1, "month").startOf("month");
		const lastMonthEnd = now.subtract(1, "month").endOf("month");
		if (sameDay(gte, weekStart)) {
			activeTab = "本周";
		} else if (sameDay(gte, monthStart)) {
			activeTab = "本月";
		} else if (
			lte &&
			sameDay(gte, lastMonthStart) &&
			sameDay(lte, lastMonthEnd)
		) {
			activeTab = "上个月";
		} else if (sameDay(gte, now.subtract(7, "day").startOf("day"))) {
			activeTab = "近7天";
		} else if (sameDay(gte, now.subtract(30, "day").startOf("day"))) {
			activeTab = "近30天";
		} else if (sameDay(gte, now.subtract(90, "day").startOf("day"))) {
			activeTab = "近90天";
		}
	}

	const handleChange = (val: string) => {
		const now = dayjs();
		let nextGte: string | undefined;
		let nextLte: string | undefined;

		if (val === "本周") {
			nextGte = now
				.day(now.day() === 0 ? -6 : 1)
				.startOf("day")
				.format("YYYY-MM-DD");
		} else if (val === "本月") {
			nextGte = now.startOf("month").format("YYYY-MM-DD");
		} else if (val === "上个月") {
			const startOfLast = now.subtract(1, "month").startOf("month");
			const endOfLast = now.subtract(1, "month").endOf("month");
			nextGte = startOfLast.format("YYYY-MM-DD");
			nextLte = endOfLast.format("YYYY-MM-DD");
		} else if (val === "近7天") {
			nextGte = now.subtract(7, "day").startOf("day").format("YYYY-MM-DD");
		} else if (val === "近30天") {
			nextGte = now.subtract(30, "day").startOf("day").format("YYYY-MM-DD");
		} else if (val === "近90天") {
			nextGte = now.subtract(90, "day").startOf("day").format("YYYY-MM-DD");
		}

		onChange(nextGte, nextLte);
	};

	return (
		<div className="relative inline-flex">
			<Select value={activeTab} onValueChange={handleChange}>
				<SelectTrigger
					className={activeTab !== "全部时间" ? "w-[110px] pr-8" : "w-[110px]"}
				>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="全部时间">全部时间</SelectItem>
					<SelectItem value="本周">本周</SelectItem>
					<SelectItem value="本月">本月</SelectItem>
					<SelectItem value="上个月">上个月</SelectItem>
					<SelectItem value="近7天">近7天</SelectItem>
					<SelectItem value="近30天">近30天</SelectItem>
					<SelectItem value="近90天">近90天</SelectItem>
				</SelectContent>
			</Select>
			{activeTab !== "全部时间" && (
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="absolute right-1 top-1/2 z-10 size-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
					aria-label="清除日期预设"
					onClick={(event) => {
						event.preventDefault();
						event.stopPropagation();
						onChange(undefined, undefined);
					}}
				>
					<X className="size-3.5" />
				</Button>
			)}
		</div>
	);
}
