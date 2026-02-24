import { useMediaQuery } from "@uidotdev/usehooks";
import { Focus, MapPinMinusInside, Menu } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import { useQuery } from "@tanstack/react-query";
import type { Id } from "convex/_generated/dataModel";
import { useMap } from "react-map-gl/maplibre";
import { Button } from "@/components/ui/button";
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
import { VirtualizedScrollArea } from "@/components/VirtualizedScrollArea";
import { pinQueries, useRemovePinMutation } from "@/queries";

export default function MenuSheet() {
	const { current: map } = useMap();

	const list = useQuery(pinQueries.list());
	const removePinMutation = useRemovePinMutation();
	const isSmallDevice = useMediaQuery("only screen and (max-width : 768px)");

	function flyToPin(pin: { latitude: number; longitude: number }) {
		if (!map) return;
		const padding = isSmallDevice
			? {
					top: 0,
					bottom: map.getContainer().clientHeight / 2,
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
		<div className="absolute top-2 left-2">
			<Sheet modal={false}>
				<Tooltip>
					<TooltipTrigger asChild>
						<SheetTrigger asChild>
							<Button
								className="cursor-pointer"
								variant="outline"
								size="icon-lg"
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
					showCloseButton={true}
					side={isSmallDevice ? "bottom" : "left"}
					// onInteractOutside={(e) => e.preventDefault()}
					className="grid grid-rows-[auto_auto_1fr] gap-2 rounded-t-md overflow-hidden w-full md:w-96 h-1/2 md:h-dvh"
				>
					<SheetHeader>
						<SheetTitle>Kampagne</SheetTitle>
						<SheetDescription>Details zur Kampagne</SheetDescription>
					</SheetHeader>
					<div className="px-4 text-muted-foreground line-clamp-2 text-end text-sm leading-normal font-normal">
						Insgesamt {list.data.length} Plakate
					</div>
					<VirtualizedScrollArea
						className="px-4"
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
												<span className="sr-only">Focus</span>
											</Button>
										</TooltipTrigger>
										<TooltipContent className="px-2 py-1 text-xs">
											Fokusiere Plakat
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
												<span className="sr-only">Hänge Plakat ab</span>
											</Button>
										</TooltipTrigger>
										<TooltipContent className="px-2 py-1 text-xs">
											Hänge Plakat ab
										</TooltipContent>
									</Tooltip>
								</div>
							</div>
						)}
					/>
				</SheetContent>
			</Sheet>
		</div>
	);
}
