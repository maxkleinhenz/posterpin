import { useQuery } from "@tanstack/react-query";
import { useMediaQuery } from "@uidotdev/usehooks";
import type { Id } from "convex/_generated/dataModel";
import type { Campaign } from "convex/schema";
import { Focus, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import { AddPin, PinMarker, PinMarkerOff, RemovePin } from "@/icons";
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
	const { current: map } = useMap();
	const [showOnlyHangedPins, setShowOnlyHangedPins] = useState(false);

	const list = useQuery(pinQueries.list(campaign._id));
	const takeDownPinMutation = useTakeDownPinMutation();
	const hangAgainPinMutation = useHangAgainPinMutation();
	const isSmallDevice = useMediaQuery("only screen and (max-width : 768px)");

	const [open, setOpen] = useState(false);
	const { setMode } = useAppStore(
		useShallow((state) => ({ setMode: state.setMode })),
	);

	const pins = useMemo(() => {
		if (!list.data) return [];
		return showOnlyHangedPins
			? list.data.filter((pin) => pin.tookDownAt === null)
			: list.data;
	}, [list.data, showOnlyHangedPins]);

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
		<div className="absolute bottom-10 left-2 grid gap-2">
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
								className="p-6"
								size="icon-lg"
								variant="outline"
								onClick={() => {
									setMode({ mode: "menu" });
								}}
							>
								<Menu className="size-5" />
								<span className="sr-only">Menü</span>
							</Button>
						</SheetTrigger>
					</TooltipTrigger>
					<TooltipContent className="px-2 py-1 text-xs" side="right">
						Menü
					</TooltipContent>
				</Tooltip>
				<SheetContent
					className="rounded-t-md w-full md:w-96 h-[80dvh] md:h-dvh"
					side={isSmallDevice ? "bottom" : "left"}
				>
					<div className="grid grid-rows-[auto_auto_1fr] gap-2 overflow-hidden h-full">
						<SheetHeader>
							<SheetTitle>{campaign.name}</SheetTitle>
							<SheetDescription>
								Insgesamt {pins.length} Plakate
							</SheetDescription>
						</SheetHeader>
						<div className="px-4">
							<Label>
								<Checkbox
									checked={showOnlyHangedPins}
									onCheckedChange={(e) =>
										e === true
											? setShowOnlyHangedPins(true)
											: setShowOnlyHangedPins(false)
									}
								/>
								Nur aufgehängte Plakate anzeigen
							</Label>
						</div>

						<VirtualScrollArea
							className="px-4"
							items={pins}
							estimateSize={() => 57}
							renderItem={(item) => (
								<div className="grid grid-cols-[1fr_auto] gap-4 p-2 rounded-md">
									{item.tookDownAt == null ? (
										<div>
											<div className="flex gap-1 items-center">
												<PinMarker className="size-5" />
												<p className="line-clamp-1 text-sm leading-snug font-medium underline-offset-4">
													Plakat
												</p>
											</div>
											<p className="text-muted-foreground line-clamp-2 text-left text-sm leading-normal font-normal">
												Gehangen am{" "}
												{new Date(item?.hangAt ?? "").toLocaleString()}
											</p>
										</div>
									) : (
										<div className="text-muted-foreground">
											<div className="flex gap-1 items-center">
												<PinMarkerOff className=" size-5" />
												<p className="line-clamp-1 text-sm leading-snug font-medium underline-offset-4 line-through">
													Plakat
												</p>
											</div>
											<p className="line-clamp-2 text-left text-sm leading-normal font-normal">
												Abgenommen am{" "}
												{new Date(item?.tookDownAt ?? "").toLocaleString()}
											</p>
										</div>
									)}

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
										{item.tookDownAt == null ? (
											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														className="rounded-none rounded-r-md shadow-none focus-visible:z-10"
														variant="outline"
														onClick={() =>
															takeDownPinMutation.mutate({
																id: item._id as Id<"pins">,
																tookDownAt: Date.now(),
															})
														}
													>
														<RemovePin />
														<span className="sr-only">Plakat abhängen</span>
													</Button>
												</TooltipTrigger>
												<TooltipContent className="px-2 py-1 text-xs">
													Plakat abhängen
												</TooltipContent>
											</Tooltip>
										) : (
											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														className="rounded-none rounded-r-md shadow-none focus-visible:z-10"
														variant="outline"
														onClick={() =>
															hangAgainPinMutation.mutate({
																id: item._id as Id<"pins">,
																hangAt: Date.now(),
															})
														}
													>
														<AddPin />
														<span className="sr-only">
															Plakat wieder aufhängen
														</span>
													</Button>
												</TooltipTrigger>
												<TooltipContent className="px-2 py-1 text-xs">
													Plakat wieder aufhängen
												</TooltipContent>
											</Tooltip>
										)}
									</div>
								</div>
							)}
						/>
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}
