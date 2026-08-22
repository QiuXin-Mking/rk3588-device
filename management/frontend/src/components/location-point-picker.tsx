import { LocateFixed, MapPinned, MoveUpRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface AMapNamespace {
	Map: new (container: HTMLDivElement, options?: AMapMapOptions) => AMapMap;
	Marker: new (options?: AMapMarkerOptions) => AMapMarker;
	Circle: new (options?: AMapCircleOptions) => AMapCircle;
	PlaceSearch: new (options?: AMapPlaceSearchOptions) => OmegaAmapPlaceSearch;
	Geocoder: new () => AMapGeocoder;
	Driving: new (options?: AMapDrivingOptions) => AMapDriving;
	Size: new (width: number, height: number) => AMapSize;
	plugin: (names: string[], callback: () => void) => void;
}

type AMapWindow = Window & {
	_AMapSecurityConfig?: {
		securityJsCode: string;
	};
	AMap?: AMapNamespace;
};

interface AMapMapOptions {
	zoom?: number;
	center?: [number, number];
	expandZoomRange?: boolean;
	resizeEnable?: boolean;
}

interface AMapMarkerOptions {
	position: [number, number];
	draggable?: boolean;
	cursor?: string;
}

interface AMapCircleOptions {
	center: [number, number];
	radius: number;
	strokeColor?: string;
	strokeOpacity?: number;
	strokeWeight?: number;
	fillColor?: string;
	fillOpacity?: number;
	zIndex?: number;
}

interface AMapSize {
	width: number;
	height: number;
}

interface AMapPlaceSearchOptions {
	pageSize?: number;
	pageIndex?: number;
	city?: string;
	citylimit?: boolean;
}

interface AMapDrivingOptions {
	extensions?: "base" | "all";
	showTraffic?: boolean;
}

interface AMapDriving {
	search(
		origin: [number, number],
		destination: [number, number],
		options: Record<string, never>,
		callback: (status: string, result: AMapDrivingResult | string) => void,
	): void;
}

interface AMapDrivingResult {
	routes?: Array<{
		distance?: number;
		time?: number;
	}>;
}

interface OmegaAmapPlaceSearch {
	search(
		keyword: string,
		callback: (status: string, result: AMapPlaceSearchResult) => void,
	): void;
	searchNearBy(
		keyword: string,
		center: [number, number],
		radius: number,
		callback: (status: string, result: AMapPlaceSearchResult) => void,
	): void;
}

interface AMapGeocoder {
	getAddress(
		location: [number, number],
		callback: (
			status: string,
			result: { regeocode?: { formattedAddress?: string } },
		) => void,
	): void;
}

interface AMapPlaceSearchResult {
	poiList?: {
		pois?: Array<{
			name?: string;
			address?: string;
			location?: { lng: number; lat: number };
		}>;
	};
}

interface AMapMarker {
	setPosition(position: [number, number]): void;
	setMap(map: AMapMap | null): void;
	on(eventName: "dragend" | "click", handler: () => void): void;
	getPosition(): { getLng(): number; getLat(): number };
}

interface AMapCircle {
	setCenter(center: [number, number]): void;
	setRadius(radius: number): void;
	setMap(map: AMapMap | null): void;
}

interface AMapMap {
	addControl(control: unknown): void;
	clearMap(): void;
	setCenter(center: [number, number]): void;
	setZoom(zoom: number): void;
	plugin(names: string[], callback: () => void): void;
	on(
		eventName: "click" | "moveend" | "zoomchange",
		handler: (event: MapClickEvent) => void,
	): void;
	destroy(): void;
	getCenter(): { getLng(): number; getLat(): number };
}

interface MapClickEvent {
	latlng?: { lng: number; lat: number };
	lnglat?: { lng: number; lat: number };
}

const AMAP_KEY =
	import.meta.env.VITE_AMAP_KEY ?? "259c691be1a51465c680189387565f04";
const AMAP_SECURITY_CODE =
	import.meta.env.VITE_AMAP_SECURITY_CODE ?? "7c68932b0ab80a1bc73110486fb979ed";
const AMAP_VERSION = "2.0";
let amapScriptPromise: Promise<void> | null = null;

function loadAmapScript() {
	const amapWindow = window as AMapWindow;
	if (amapWindow.AMap) return Promise.resolve();
	if (amapScriptPromise) return amapScriptPromise;

	amapWindow._AMapSecurityConfig = {
		securityJsCode: AMAP_SECURITY_CODE,
	};

	amapScriptPromise = new Promise((resolve, reject) => {
		const existing = document.getElementById("omega-amap-jsapi");
		if (existing) {
			existing.addEventListener("load", () => resolve());
			existing.addEventListener("error", () =>
				reject(new Error("高德地图加载失败")),
			);
			return;
		}

		const script = document.createElement("script");
		script.id = "omega-amap-jsapi";
		script.async = true;
		script.src = `https://webapi.amap.com/maps?v=${AMAP_VERSION}&key=${AMAP_KEY}`;
		script.onload = () => resolve();
		script.onerror = () => reject(new Error("高德地图加载失败"));
		document.head.appendChild(script);
	});

	return amapScriptPromise;
}

export interface DrivingRouteEstimate {
	distanceM: number;
	durationS: number;
}

export async function calculateAmapDrivingRoute({
	origin,
	destination,
}: {
	origin: [number, number];
	destination: [number, number];
}): Promise<DrivingRouteEstimate> {
	await loadAmapScript();
	const amapWindow = window as AMapWindow;
	const AMap = amapWindow.AMap;
	if (!AMap) {
		throw new Error("高德地图尚未加载完成");
	}

	return new Promise((resolve, reject) => {
		let settled = false;
		const timer = window.setTimeout(() => {
			settled = true;
			reject(new Error("路线计算超时，请重试"));
		}, 15_000);
		const finish = (callback: () => void) => {
			if (settled) return;
			settled = true;
			window.clearTimeout(timer);
			callback();
		};

		AMap.plugin(["AMap.Driving"], () => {
			const driving = new AMap.Driving({
				extensions: "base",
				showTraffic: true,
			});
			driving.search(origin, destination, {}, (status, result) => {
				const route = typeof result === "string" ? null : result.routes?.[0];
				const distanceM = route?.distance;
				const durationS = route?.time;
				if (status !== "complete" || distanceM == null || durationS == null) {
					finish(() => reject(new Error("未获取到可用的驾车路线")));
					return;
				}
				finish(() =>
					resolve({
						distanceM: Math.round(distanceM),
						durationS: Math.round(durationS),
					}),
				);
			});
		});
	});
}

export interface LocationValue {
	latitude: number | null;
	longitude: number | null;
	radius_m: number;
	address?: string | null;
}

export interface PresetLocation {
	id?: string;
	latitude: number;
	longitude: number;
	radius_m?: number;
	location_address: string;
}

export interface LocationPointPickerProps {
	value: LocationValue;
	onChange: (next: LocationValue) => void;
	disabled?: boolean;
	title?: string;
	showRadius?: boolean;
	presetLocations?: PresetLocation[];
	selectedPresetLocationId?: string | null;
	onPresetLocationChange?: (presetLocationId: string | null) => void;
	onSaveAsPreset?: (location: LocationValue) => void | Promise<void>;
	savingPreset?: boolean;
}

export function LocationPointPicker({
	value,
	onChange,
	disabled,
	title = "设备所在区域",
	showRadius = true,
	presetLocations = [],
	selectedPresetLocationId,
	onPresetLocationChange,
	onSaveAsPreset,
	savingPreset = false,
}: LocationPointPickerProps) {
	const mapRef = useRef<HTMLDivElement | null>(null);
	const mapInstanceRef = useRef<AMapMap | null>(null);
	const markerRef = useRef<AMapMarker | null>(null);
	const circleRef = useRef<AMapCircle | null>(null);
	const [loaded, setLoaded] = useState(Boolean((window as AMapWindow).AMap));
	const [loadError, setLoadError] = useState<string | null>(null);
	const [searchKeyword, setSearchKeyword] = useState("");
	const [searchResults, setSearchResults] = useState<
		Array<{ name: string; address?: string; lng: number; lat: number }>
	>([]);
	const [searching, setSearching] = useState(false);
	const selectedPresetLocation = useMemo(
		() =>
			presetLocations.find((item) => item.id === selectedPresetLocationId) ??
			null,
		[presetLocations, selectedPresetLocationId],
	);
	const centerLng = value.longitude ?? 121.4737;
	const centerLat = value.latitude ?? 31.2304;
	const center = useMemo(
		() => [centerLng, centerLat] as [number, number],
		[centerLng, centerLat],
	);
	const displayAddress =
		value.address || selectedPresetLocation?.location_address || null;

	const emitChange = useCallback(
		(next: LocationValue, presetLocationId: string | null = null) => {
			onPresetLocationChange?.(presetLocationId);
			onChange(next);
		},
		[onChange, onPresetLocationChange],
	);
	const emitCoordinates = useCallback(
		(latitude: number, longitude: number) => {
			const amapWindow = window as AMapWindow;
			const AMap: AMapNamespace | undefined = amapWindow.AMap;
			if (!AMap) {
				emitChange({
					latitude,
					longitude,
					radius_m: value.radius_m || 100,
					address: value.address || null,
				});
				return;
			}
			AMap.plugin(["AMap.Geocoder"], () => {
				new AMap.Geocoder().getAddress(
					[longitude, latitude],
					(status, result) => {
						emitChange({
							latitude,
							longitude,
							radius_m: value.radius_m || 100,
							address:
								status === "complete"
									? result.regeocode?.formattedAddress || null
									: value.address || null,
						});
					},
				);
			});
		},
		[emitChange, value.address, value.radius_m],
	);

	useEffect(() => {
		let cancelled = false;
		void loadAmapScript()
			.then(() => {
				if (!cancelled) setLoaded(true);
			})
			.catch((error: Error) => {
				if (!cancelled) setLoadError(error.message);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!selectedPresetLocation || disabled) {
			return;
		}
		const nextAddress = selectedPresetLocation.location_address || "";
		if (nextAddress && nextAddress !== value.address) {
			emitChange(
				{
					...value,
					address: nextAddress,
				},
				selectedPresetLocation.id ?? null,
			);
		}
	}, [disabled, emitChange, selectedPresetLocation, value]);

	useEffect(() => {
		const amapWindow = window as AMapWindow;
		if (!loaded || !mapRef.current || !amapWindow.AMap) {
			return;
		}

		if (!mapInstanceRef.current) {
			const map = new amapWindow.AMap.Map(mapRef.current, {
				zoom: 16,
				center,
				resizeEnable: true,
				expandZoomRange: true,
			});
			mapInstanceRef.current = map;

			const marker = new amapWindow.AMap.Marker({
				position: center,
				draggable: !disabled,
				cursor: disabled ? "default" : "move",
			});
			marker.on("dragend", () => {
				const position = markerRef.current?.getPosition?.();
				if (!position) return;
				emitCoordinates(position.getLat(), position.getLng());
			});
			marker.setMap(map);
			markerRef.current = marker;

			if (showRadius) {
				const circle = new amapWindow.AMap.Circle({
					center,
					radius: value.radius_m || 100,
					strokeColor: "#1677ff",
					strokeOpacity: 0.85,
					strokeWeight: 2,
					fillColor: "#1677ff",
					fillOpacity: 0.14,
					zIndex: 10,
				});
				circle.setMap(map);
				circleRef.current = circle;
			}

			map.on("click", (event) => {
				if (disabled) return;
				const lng = event.lnglat?.lng ?? event.latlng?.lng;
				const lat = event.lnglat?.lat ?? event.latlng?.lat;
				if (lng == null || lat == null) return;
				emitCoordinates(lat, lng);
			});
			return;
		}

		mapInstanceRef.current.setCenter(center);
		markerRef.current?.setPosition(center);
		circleRef.current?.setCenter(center);
		circleRef.current?.setRadius(value.radius_m || 100);
	}, [center, disabled, emitCoordinates, loaded, showRadius, value.radius_m]);

	useEffect(() => {
		const keyword = searchKeyword.trim();
		const amapWindow = window as AMapWindow;
		if (!loaded || !amapWindow.AMap) {
			return;
		}
		if (!keyword) {
			setSearchResults([]);
			return;
		}

		let cancelled = false;
		const timer = window.setTimeout(() => {
			setSearching(true);
			const AMap: AMapNamespace | undefined = amapWindow.AMap;
			if (!AMap) {
				setSearching(false);
				return;
			}
			AMap.plugin(["AMap.PlaceSearch"], () => {
				if (cancelled) {
					setSearching(false);
					return;
				}
				const placeSearch = new AMap.PlaceSearch({
					pageSize: 5,
					pageIndex: 1,
					city: "全国",
					citylimit: false,
				});
				placeSearch.search(keyword, (status, result) => {
					if (cancelled) {
						setSearching(false);
						return;
					}
					const pois =
						status === "complete" ? (result.poiList?.pois ?? []) : [];
					setSearchResults(
						pois
							.map((item) => {
								const lng = item.location?.lng;
								const lat = item.location?.lat;
								if (lng == null || lat == null || !item.name) {
									return null;
								}
								return {
									name: item.name,
									address: item.address,
									lng,
									lat,
								};
							})
							.filter(Boolean) as Array<{
							name: string;
							address?: string;
							lng: number;
							lat: number;
						}>,
					);
					setSearching(false);
				});
			});
		}, 300);

		return () => {
			cancelled = true;
			window.clearTimeout(timer);
		};
	}, [loaded, searchKeyword]);

	useEffect(() => {
		return () => {
			markerRef.current?.setMap(null);
			circleRef.current?.setMap(null);
			mapInstanceRef.current?.destroy();
			mapInstanceRef.current = null;
			markerRef.current = null;
			circleRef.current = null;
		};
	}, []);

	const handleUseCurrentLocation = () => {
		if (!navigator.geolocation || disabled) {
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(position) => {
				emitCoordinates(position.coords.latitude, position.coords.longitude);
			},
			() => {
				// Ignore geolocation errors; the map can still be used manually.
			},
			{ enableHighAccuracy: true, timeout: 10_000 },
		);
	};

	const handleSelectResult = (next: {
		name: string;
		address?: string;
		lng: number;
		lat: number;
	}) => {
		emitChange({
			latitude: next.lat,
			longitude: next.lng,
			radius_m: value.radius_m || 100,
			address: next.address ? `${next.name} (${next.address})` : next.name,
		});
		setSearchKeyword("");
		setSearchResults([]);
	};

	const handleSelectPreset = (presetLocationId: string) => {
		const presetLocation = presetLocations.find(
			(item) => item.id === presetLocationId,
		);
		if (!presetLocation) {
			onPresetLocationChange?.(null);
			return;
		}
		emitChange(
			{
				latitude: presetLocation.latitude,
				longitude: presetLocation.longitude,
				radius_m: presetLocation.radius_m || 100,
				address: presetLocation.location_address,
			},
			presetLocation.id ?? null,
		);
		setSearchKeyword("");
		setSearchResults([]);
	};

	const handleSaveAsPreset = () => {
		if (!onSaveAsPreset || disabled) {
			return;
		}
		void onSaveAsPreset({
			latitude: value.latitude,
			longitude: value.longitude,
			radius_m: value.radius_m || 100,
			address: value.address || "",
		});
	};

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2 text-sm font-medium">
					<MapPinned className="size-4 text-primary" />
					{title}
				</div>
				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={handleUseCurrentLocation}
						disabled={disabled}
					>
						<LocateFixed className="mr-2 size-4" />
						使用当前位置
					</Button>
				</div>
			</div>

			<div className="grid gap-3 md:min-h-[360px] md:grid-cols-[minmax(0,1fr)_280px] md:items-stretch">
				<div
					ref={mapRef}
					className="min-h-[220px] min-w-0 overflow-hidden rounded-lg border border-border bg-background md:h-full"
				/>
				<div className="min-w-0 rounded-lg border border-border bg-background p-3 md:h-full md:overflow-y-auto">
					<div className="grid gap-3">
						{presetLocations.length ? (
							<div className="grid gap-1 text-sm">
								<span className="text-muted-foreground">预存地点</span>
								<Select
									value={selectedPresetLocationId ?? ""}
									onValueChange={handleSelectPreset}
									disabled={disabled}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="选择预存地点" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											{presetLocations.map((item) => (
												<SelectItem key={item.id} value={item.id ?? ""}>
													<span className="block max-w-[220px] truncate">
														{item.location_address}
													</span>
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
							</div>
						) : null}
						<div className="grid gap-1 text-sm">
							<span className="text-muted-foreground">位置搜索</span>
							<Input
								value={searchKeyword}
								onChange={(event) => setSearchKeyword(event.target.value)}
								placeholder="输入小区、门口、仓库、停车场等关键词"
								disabled={disabled}
							/>
						</div>
						{searchKeyword.trim() ? (
							<div className="max-h-44 space-y-1 overflow-auto rounded-md border border-border bg-background p-2">
								{searching ? (
									<div className="px-2 py-1 text-xs text-muted-foreground">
										搜索中...
									</div>
								) : searchResults.length ? (
									searchResults.map((item) => (
										<button
											key={`${item.name}-${item.lng}-${item.lat}`}
											type="button"
											className="w-full rounded-md px-2 py-1 text-left text-sm hover:bg-muted"
											onClick={() => handleSelectResult(item)}
											disabled={disabled}
										>
											<div
												className="truncate font-medium text-foreground"
												title={item.name}
											>
												{item.name}
											</div>
											{item.address ? (
												<div
													className="truncate text-xs text-muted-foreground"
													title={item.address}
												>
													{item.address}
												</div>
											) : null}
										</button>
									))
								) : (
									<div className="px-2 py-1 text-xs text-muted-foreground">
										没有匹配结果
									</div>
								)}
							</div>
						) : null}
						<div className="rounded-md border border-border bg-background p-3">
							<div className="text-xs text-muted-foreground">定位名称</div>
							<div className="mt-1 break-words text-sm font-medium leading-5 text-foreground">
								{displayAddress || "请选择位置"}
							</div>
						</div>
						{showRadius ? (
							<div className="grid gap-1 text-sm">
								<span className="text-muted-foreground">半径（米）</span>
								<Input
									type="number"
									min={1}
									max={5000}
									value={value.radius_m}
									onChange={(event) => {
										const next = Number(event.target.value || 100);
										onChange({ ...value, radius_m: next });
									}}
									disabled={disabled}
								/>
							</div>
						) : null}
						{onSaveAsPreset ? (
							<Button
								type="button"
								variant="outline"
								onClick={handleSaveAsPreset}
								disabled={disabled || savingPreset}
							>
								{savingPreset ? "保存中..." : "保存为预存地点"}
							</Button>
						) : null}
						{loadError ? (
							<div className="text-xs text-destructive">{loadError}</div>
						) : null}
						{!loaded ? (
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<MoveUpRight className="size-4 animate-pulse" />
								地图加载中...
							</div>
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
}
