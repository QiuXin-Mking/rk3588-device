import { PageHeader } from "../../shared/ui/DevicePrimitives";
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export function GripperScreen({ back }: { back: () => void }) {
	return (
		<div className="page detail-page">
			<PageHeader title="夹爪角度" subtitle="数据接口待接入" back={back} />
			<div className="grid min-h-0 flex-1 grid-cols-2 gap-[var(--gap)]">
				{["左夹爪", "右夹爪"].map((name) => (
					<Card className="flex min-h-0 flex-col border-sky-500/20 bg-sky-500/5 p-7" key={name}>
						<div className="flex items-center justify-between gap-5">
							<h2 className="text-[length:var(--device-text-lg)] font-bold">{name}</h2>
							<Badge size="device" variant="outline">预留</Badge>
						</div>
						<div className="relative mt-[22px] grid min-h-0 flex-1 place-items-center overflow-hidden rounded-xl bg-secondary/60 text-[length:var(--device-text-sm)] text-muted-foreground">
							<div className="absolute inset-y-4 left-[18px] flex flex-col justify-between text-[length:var(--device-text-xs)]">
								180°<span>90°</span>
								<span>0°</span>
							</div>
							<svg className="absolute inset-[12%_5%_12%_10%] h-[76%] w-[85%]" viewBox="0 0 600 180" preserveAspectRatio="none">
								<path className="fill-none stroke-sky-500 [stroke-width:4]" d="M0 140 C80 132, 120 90, 190 108 S330 60, 410 82 S520 40, 600 52" />
							</svg>
							<span>等待角度数据</span>
						</div>
					</Card>
				))}
			</div>
		</div>
	);
}
