import { useMediaQuery } from "@uidotdev/usehooks";
import { cn } from "cn";
import { Check, MapIcon, SlidersHorizontal } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { colors, type PinColor } from "@/colors";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Item, ItemContent, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import { env } from "@/env";
import {
	defaultAuracyVisiblity,
	defaultFilter,
	useAppStore,
} from "@/store/app-store";
import {
	defaultMapStyle,
	mapStyles,
	useMapSettings,
} from "@/store/map-settings";

import { MapPanel } from "./map-panel";

const filterItems: {
	key: "hung" | "tookDown" | "planned";
	label: string;
	color: string;
}[] = [
	{ key: "hung", label: "Aufgehängt", color: "bg-amber-400" },
	{ key: "tookDown", label: "Abgehängt", color: "bg-gray-400" },
	{ key: "planned", label: "Geplant", color: "bg-blue-500" },
];

export default function PinSettingsPopup() {
	const isSmallDevice = useMediaQuery("only screen and (max-width : 768px)");

	const [open, setOpen] = useState(false);
	const mapStyleId = useId();
	const mapStyle = useMapSettings((state) => state.mapStyle);
	const setMapStyle = useMapSettings((state) => state.setMapStyle);

	const {
		pinFilter,
		setPinFilter,
		setMode,
		isAuracyVisible,
		setIsAuracyVisible,
	} = useAppStore(
		useShallow((state) => ({
			pinFilter: state.pinFilter,
			setPinFilter: state.setPinFilter,
			setMode: state.setMode,
			isAuracyVisible: state.isAuracyVisible,
			setIsAuracyVisible: state.setIsAuracyVisible,
		})),
	);

	const changedSettings = useMemo(() => {
		return (
			defaultFilter.hung !== pinFilter.hung ||
			defaultFilter.planned !== pinFilter.planned ||
			defaultFilter.tookDown !== pinFilter.tookDown ||
			isAuracyVisible !== defaultAuracyVisiblity ||
			mapStyle !== defaultMapStyle ||
			Object.values(pinFilter.colors).some((c) => !c)
		);
	}, [
		pinFilter.hung,
		pinFilter.planned,
		pinFilter.tookDown,
		isAuracyVisible,
		mapStyle,
		pinFilter.colors,
	]);

	return (
		<MapPanel
			side="right"
			open={open}
			onOpenChange={setOpen}
			title="Einstellungen"
			description="Anpassungen von Karteneinstellungen"
			label="Einstellungen"
			mobileClassName="gap-0 rounded-t-md w-full max-h-4/5"
			trigger={
				<Button
					className="relative p-5"
					size="icon-lg"
					variant={changedSettings ? "default" : "ghost"}
				>
					<SlidersHorizontal className="size-5" />
					<span className="sr-only">Einstellungen</span>
				</Button>
			}
		>
			<ItemGroup className="rounded-md overflow-auto px-2">
				<Item>
					<ItemContent className="flex gap-2 items-start">
						<Button
							variant="outline"
							onClick={() => {
								setMode({ mode: "planning" });
								if (isSmallDevice) setOpen(false);
							}}
						>
							<MapIcon className="size-5" /> Planen
						</Button>
					</ItemContent>
				</Item>
				<Item className="hover:bg-muted/50">
					<ItemContent className="grid gap-2">
						<div>
							<ItemTitle>Plakate anzeigen</ItemTitle>
						</div>
						<div className="space-y-4">
							<div className="flex flex-wrap gap-x-10 gap-y-2">
								{filterItems.map(({ key, label }) => (
									<Label
										key={key}
										className="flex items-center gap-2 cursor-pointer font-normal py-2"
									>
										<Checkbox
											checked={pinFilter[key]}
											onCheckedChange={(checked) =>
												setPinFilter({
													...pinFilter,
													[key]: checked === true,
												})
											}
										/>
										{label}
									</Label>
								))}
							</div>
							<div className="flex flex-wrap gap-2">
								{Object.keys(colors).map((color) => (
									<ColorButton
										key={color}
										color={color as keyof typeof colors}
										selected={pinFilter.colors[color as PinColor]}
										onToggle={() =>
											setPinFilter({
												...pinFilter,
												colors: {
													...pinFilter.colors,
													[color as PinColor]:
														!pinFilter.colors[color as PinColor],
												},
											})
										}
									/>
								))}
							</div>
						</div>
					</ItemContent>
				</Item>
				<Item className="hover:bg-muted/50">
					<ItemContent className="grid gap-2">
						<div>
							<ItemTitle>Karte</ItemTitle>
						</div>
						<fieldset className="min-w-0 mb-2">
							<div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2">
								{mapStyles.map((style) => (
									<label key={style.id} className="relative cursor-pointer">
										<input
											type="radio"
											name={mapStyleId}
											value={style.id}
											checked={mapStyle === style.id}
											onChange={() => setMapStyle(style.id)}
											className="peer sr-only"
										/>
										<div className="bg-background h-full overflow-hidden rounded-lg border-2 border-border transition-colors hover:border-muted-foreground/50 peer-checked:border-primary peer-checked:bg-primary/5 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">
											<img
												src={`https://api.maptiler.com/maps/${style.id}/256/14/8817/5481@2x.png?key=${env.VITE_MAPTILER_KEY}`}
												alt=""
												width={256}
												height={256}
												loading="lazy"
												className="aspect-square w-full object-cover"
											/>
											<span className="block px-1.5 py-2 text-center text-xs font-medium leading-4">
												{style.label}
											</span>
										</div>
										{mapStyle === style.id && (
											<span
												aria-hidden="true"
												className="absolute right-1.5 top-1.5 rounded-full bg-primary p-1 text-primary-foreground shadow-sm"
											>
												<Check className="size-3 stroke-3" />
											</span>
										)}
									</label>
								))}
							</div>
							<p className="mt-1.5 text-[10px] text-muted-foreground">
								©{" "}
								<a
									href="https://www.maptiler.com/copyright/"
									target="_blank"
									rel="noreferrer"
									className="hover:underline"
								>
									MapTiler
								</a>{" "}
								©{" "}
								<a
									href="https://www.openstreetmap.org/copyright"
									target="_blank"
									rel="noreferrer"
									className="hover:underline"
								>
									OpenStreetMap
								</a>
							</p>
						</fieldset>
						<div className="grid gap-2">
							<Label className="flex items-center gap-2 cursor-pointer font-normal">
								<Checkbox
									checked={isAuracyVisible}
									onCheckedChange={(checked) =>
										setIsAuracyVisible(checked === true)
									}
								/>
								Genauigkeitskreis anzeigen
							</Label>
						</div>
					</ItemContent>
				</Item>
				<Item>
					<ItemContent className="flex gap-2 items-start">
						<Button
							variant="outline"
							onClick={() => {
								setPinFilter({ ...defaultFilter });
								setIsAuracyVisible(defaultAuracyVisiblity);
								setMapStyle(defaultMapStyle);
							}}
						>
							Einstellungen zurücksetzen
						</Button>
					</ItemContent>
				</Item>
			</ItemGroup>
		</MapPanel>
	);
}

function ColorButton({
	color,
	selected,
	onToggle,
}: {
	color: keyof typeof colors;
	selected: boolean;
	onToggle: () => void;
}) {
	return (
		<Button
			className={cn("size-10", colors[color].bg)}
			onClick={() => onToggle()}
			aria-label={colors[color].label}
			aria-pressed={selected}
		>
			{selected && (
				<Check className="stroke-3 rounded-full bg-muted text-muted-foreground size-4 p-0.5" />
			)}
		</Button>
	);
}
