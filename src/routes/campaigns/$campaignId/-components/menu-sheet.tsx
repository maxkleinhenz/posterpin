import { useQuery } from "@tanstack/react-query";
import { useMediaQuery } from "@uidotdev/usehooks";
import type { Id } from "convex/_generated/dataModel";
import type { Campaign } from "convex/schema";
import { Focus, Menu } from "lucide-react";
import { colors, type PinColor } from "@/colors";
import { Button } from "@/components/ui/button";
import { VirtualScrollArea } from "@/components/ui/scroll-area";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	AddPin,
	PinMarker,
	PinMarkerOff,
	PinMarkerPlanned,
	RemovePin,
} from "@/icons";
import {
	pinQueries,
	useHangAgainPinMutation,
	useTakeDownPinMutation,
} from "@/queries/pins";
import { useAppStore } from "@/store/app-store";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMemo, useState } from "react";
import { useMap } from "react-map-gl/maplibre";
import { useShallow } from "zustand/react/shallow";

export default function MenuSheet({ campaign }: { campaign: Campaign }) {
	const maps = useMap();
	const map = maps.current ?? maps.default;

	const list = useQuery(pinQueries.list(campaign._id));
	const takeDownPinMutation = useTakeDownPinMutation();
	const hangAgainPinMutation = useHangAgainPinMutation();
	const isSmallDevice = useMediaQuery("only screen and (max-width : 768px)");

	const [open, setOpen] = useState(false);
	const { setMode, pinFilter } = useAppStore(
		useShallow((state) => ({
			setMode: state.setMode,
			pinFilter: state.pinFilter,
		})),
	);

	const pins = useMemo(() => {
		if (!list.data) return [];
		return list.data.filter((pin) => {
			if (pin.hangAt === null && pin.tookDownAt === null)
				return pinFilter.planned;
			if (pin.tookDownAt !== null) return pinFilter.tookDown;
			return pinFilter.hung;
		});
	}, [list.data, pinFilter]);

	function flyToPin(pin: { latitude: number; longitude: number }) {
		if (!map) return;
		const padding = isSmallDevice
			? {
					top: 0,
					bottom: map.getContainer().clientHeight * 0.8, // shadcn caps height at 80vh
					left: 0,
					right: 0,
				}
			: {
					top: 0,
					bottom: 0,
					left: 384, // width of the SheetContent w-96
					right: 0,
				};

		map.flyTo({
			center: { lat: pin.latitude, lng: pin.longitude },
			zoom: map.getZoom() < 18 ? 18 : map.getZoom(),
			padding: padding,
		});
	}

	return (
		<div className="grid gap-2">
			<Sheet
				modal={false}
				open={open}
				onOpenChange={(o) => {
					if (!o) setMode({ mode: "none" });
					setOpen(o);
				}}
			>
				<Tooltip>
					<TooltipTrigger asChild>
						{/* Menu */}
						<SheetTrigger asChild>
							<Button
								className="p-5"
								variant="ghost"
								size="icon-lg"
								onClick={() => {
									setMode({ mode: "menu" });
								}}
							>
								<Menu className="size-5" />
								<span className="sr-only">Menü</span>
							</Button>
						</SheetTrigger>
					</TooltipTrigger>
					<TooltipContent className="px-2 py-1 text-xs" side="top">
						Menü
					</TooltipContent>
				</Tooltip>
				<SheetContent
					className="rounded-t-md w-full md:w-96 h-[80dvh] md:h-dvh"
					side={isSmallDevice ? "bottom" : "left"}
				>
					<div className="grid grid-rows-[auto_1fr] gap-2 overflow-hidden h-full">
						<SheetHeader>
							<SheetTitle>{campaign.name}</SheetTitle>
							<SheetDescription>
								Insgesamt {pins.length} Plakate
							</SheetDescription>
						</SheetHeader>

						<VirtualScrollArea
							className="px-4"
							items={pins}
							estimateSize={() => 57}
							renderItem={(item) => {
								const pin =
									item.hangAt == null && item.tookDownAt == null
										? {
												icon: <PinMarkerPlanned className="size-5" />,
												label: "Geplant",
												muted: true,
												strike: false,
												actionIcon: <AddPin />,
												actionLabel: "Jetzt aufhängen",
												onAction: () =>
													hangAgainPinMutation.mutate({
														id: item._id as Id<"pins">,
														hangAt: Date.now(),
													}),
											}
										: item.tookDownAt != null
											? {
													icon: <PinMarkerOff className="size-5" />,
													label: `Abgenommen am ${new Date(item.tookDownAt).toLocaleString()}`,
													muted: true,
													strike: true,
													actionIcon: <AddPin />,
													actionLabel: "Plakat wieder aufhängen",
													onAction: () =>
														hangAgainPinMutation.mutate({
															id: item._id as Id<"pins">,
															hangAt: Date.now(),
														}),
												}
											: {
													icon: <PinMarker className="size-5" />,
													label: `Gehangen am ${new Date(item.hangAt ?? "").toLocaleString()}`,
													muted: false,
													strike: false,
													actionIcon: <RemovePin />,
													actionLabel: "Plakat abhängen",
													onAction: () =>
														takeDownPinMutation.mutate({
															id: item._id as Id<"pins">,
															tookDownAt: Date.now(),
														}),
												};
								return (
									<div className="grid grid-cols-[6px_1fr_auto] gap-2 rounded-md">
										<div
											className={`rounded-full ${colors[item.color as PinColor].bg}`}
										/>
										<div className={pin.muted ? "text-muted-foreground" : ""}>
											<div className="flex gap-1 items-center">
												{pin.icon}
												<p
													className={`line-clamp-1 text-sm leading-snug font-medium underline-offset-4${pin.strike ? " line-through" : ""}`}
												>
													Plakat
												</p>
											</div>
											<p
												className={`line-clamp-2 text-left text-sm leading-normal font-normal${pin.muted ? "" : " text-muted-foreground"}`}
											>
												{pin.label}
											</p>
										</div>

										<div className="inline-flex w-fit -space-x-px rounded-md rtl:space-x-reverse">
											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														className="rounded-none rounded-l-md shadow-none focus-visible:z-10"
														variant="outline"
														onClick={() =>
															flyToPin({
																latitude: item.latitude,
																longitude: item.longitude,
															})
														}
													>
														<Focus />
														<span className="sr-only">Zentriere Plakat</span>
													</Button>
												</TooltipTrigger>
												<TooltipContent className="px-2 py-1 text-xs">
													Zentriere Plakat
												</TooltipContent>
											</Tooltip>
											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														className="rounded-none rounded-r-md shadow-none focus-visible:z-10"
														variant="outline"
														onClick={pin.onAction}
													>
														{pin.actionIcon}
														<span className="sr-only">{pin.actionLabel}</span>
													</Button>
												</TooltipTrigger>
												<TooltipContent className="px-2 py-1 text-xs">
													{pin.actionLabel}
												</TooltipContent>
											</Tooltip>
										</div>
									</div>
								);
							}}
						/>
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}
