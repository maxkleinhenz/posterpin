import { useMediaQuery } from "@uidotdev/usehooks";
import { Focus, MapPinMinusInside, Menu, X } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import { useQuery } from "@tanstack/react-query";
import type { Id } from "convex/_generated/dataModel";
import { useEffect, useState } from "react";
import { useMap } from "react-map-gl/maplibre";
import { cn } from "src/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { VirtualizedScrollArea } from "@/components/VirtualizedScrollArea";
import { pinQueries, useRemovePinMutation } from "@/queries";
import type { FocusedPin } from "./pin-details-sheet";

const snapPoints = [0.8, 1];

export default function MenuSheet({ focusedPin }: { focusedPin?: FocusedPin }) {
	const { current: map } = useMap();

	const list = useQuery(pinQueries.list());
	const removePinMutation = useRemovePinMutation();
	const isSmallDevice = useMediaQuery("only screen and (max-width : 768px)");

	const [open, setOpen] = useState(false);
	const [snap, setSnap] = useState<number | string | null>(snapPoints[0]);

	useEffect(() => {
		if (focusedPin?.id) {
			setOpen(false);
		}
	}, [focusedPin?.id]);

	function flyToPin(pin: { latitude: number; longitude: number }) {
		if (!map) return;
		const padding = isSmallDevice
			? {
					top: 0,
					bottom: map.getContainer().clientHeight * Number(snap) * 0.8, // shadcn caps height at 80vh
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

	if (!list.data) return null;

	return (
		<div className="absolute top-2 left-2 grid gap-2">
			<Drawer
				modal={false}
				open={open}
				onOpenChange={setOpen}
				direction={isSmallDevice ? "bottom" : "left"}
				snapPoints={isSmallDevice ? snapPoints : undefined}
				activeSnapPoint={snap}
				setActiveSnapPoint={setSnap}
			>
				<Tooltip>
					<TooltipTrigger asChild>
						<DrawerTrigger asChild>
							{/* Menu */}
							<Button
								className="cursor-pointer min-h-13 min-w-13"
								variant="outline"
							>
								<Menu className="size-5" />
								<span className="sr-only">Menü</span>
							</Button>
						</DrawerTrigger>
					</TooltipTrigger>
					<TooltipContent className="px-2 py-1 text-xs" side="right">
						Menü
					</TooltipContent>
				</Tooltip>
				<DrawerContent className={cn("rounded-t-md w-full md:w-96 md:h-dvh")}>
					<DrawerHeader className="relative">
						<DrawerTitle>Kampagne</DrawerTitle>
						<DrawerDescription>Details zur Kampagne</DrawerDescription>

						<Button
							className="absolute top-2 right-2 rounded-md"
							variant="ghost"
							size="icon"
							onClick={() => {
								setOpen(false);
							}}
						>
							<X />
						</Button>
					</DrawerHeader>
					<div className="grid grid-rows-[auto_auto_1fr] gap-2 overflow-hidden">
						<div className="px-4 text-muted-foreground line-clamp-2 text-end text-sm leading-normal font-normal">
							Insgesamt {list.data.length} Plakate
						</div>
						<VirtualizedScrollArea
							className={cn("px-4", {
								"h-4/5": isSmallDevice && snap === snapPoints[0],
							})}
							items={list.data}
							estimateSize={() => 57}
							listHeight="100%"
							renderItem={(item) => (
								<div className="grid grid-cols-[1fr_auto] gap-4 p-2 rounded-md">
									<div>
										<p className="line-clamp-1 text-sm leading-snug font-medium underline-offset-4">
											Plakat
										</p>
										<p className="text-muted-foreground line-clamp-2 text-left text-sm leading-normal font-normal">
											Gehangen am{" "}
											{new Date(item?._creationTime ?? "").toLocaleString()}
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
													onClick={() =>
														removePinMutation.mutate({
															id: item._id as Id<"pins">,
														})
													}
												>
													<MapPinMinusInside />
													<span className="sr-only">Plakat abhängen</span>
												</Button>
											</TooltipTrigger>
											<TooltipContent className="px-2 py-1 text-xs">
												Plakat abhängen
											</TooltipContent>
										</Tooltip>
									</div>
								</div>
							)}
						/>
					</div>
				</DrawerContent>
			</Drawer>
		</div>
	);
}
