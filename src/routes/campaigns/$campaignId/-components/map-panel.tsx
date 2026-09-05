import { useMediaQuery } from "@uidotdev/usehooks";
import { X } from "lucide-react";
import { Slot } from "radix-ui";
import {
	useEffect,
	useId,
	useRef,
	useState,
	type ReactElement,
	type ReactNode,
} from "react";
import { createPortal } from "react-dom";

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
	Sidebar,
	SidebarContent,
	SidebarHeader,
} from "@/components/ui/sidebar";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { PANEL_SLIDE_MS, useMapPanelSlot } from "./map-sheet-layout";

// The docked panel has to stay mounted while it slides shut, and it has to be
// painted collapsed once before it may expand — otherwise the browser has no
// start value to transition from and the panel just pops into place.
function useSlideState(open: boolean) {
	const [mounted, setMounted] = useState(open);
	const [expanded, setExpanded] = useState(open);

	// Mounting collapsed and collapsing again happen in the render the toggle
	// triggered, so the panel is never a frame behind the click.
	if (open && !mounted) setMounted(true);
	if (!open && expanded) setExpanded(false);

	useEffect(() => {
		if (!open) {
			const timer = setTimeout(() => setMounted(false), PANEL_SLIDE_MS);
			return () => clearTimeout(timer);
		}
		if (expanded) return;
		// The first frame paints the collapsed panel, the second starts the slide.
		let second = 0;
		const first = requestAnimationFrame(() => {
			second = requestAnimationFrame(() => setExpanded(true));
		});
		return () => {
			cancelAnimationFrame(first);
			cancelAnimationFrame(second);
		};
	}, [open, expanded]);

	return { mounted, expanded };
}

export function MapPanel({
	side,
	open,
	onOpenChange,
	title,
	description,
	label,
	trigger,
	children,
	mobileClassName,
}: {
	side: "left" | "right";
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: ReactNode;
	description: ReactNode;
	label: string;
	trigger: ReactElement;
	children: ReactNode;
	mobileClassName?: string;
}) {
	const isSmallDevice = useMediaQuery("only screen and (max-width : 768px)");
	const { slot, pinViewport } = useMapPanelSlot(side);
	const id = useId();
	const triggerRef = useRef<HTMLButtonElement>(null);
	const Trigger = isSmallDevice ? SheetTrigger : Slot.Root;
	const { mounted, expanded } = useSlideState(open);

	// The docked panel takes its width out of the map, so hold the map viewport
	// still for the slide instead of letting it resize frame by frame.
	const wasOpen = useRef(open);
	useEffect(() => {
		if (wasOpen.current === open) return;
		wasOpen.current = open;
		if (!isSmallDevice) pinViewport(side);
	}, [open, isSmallDevice, side, pinViewport]);

	return (
		<Sheet
			modal={false}
			open={isSmallDevice && open}
			onOpenChange={onOpenChange}
		>
			<Tooltip>
				<TooltipTrigger asChild>
					<Trigger
						{...(isSmallDevice
							? { asChild: true }
							: { onClick: () => onOpenChange(!open) })}
						ref={triggerRef}
						aria-expanded={open}
						aria-controls={open ? id : undefined}
					>
						{trigger}
					</Trigger>
				</TooltipTrigger>
				<TooltipContent>{label}</TooltipContent>
			</Tooltip>
			{isSmallDevice ? (
				<SheetContent id={id} side="bottom" className={mobileClassName}>
					<SheetHeader className="pr-12">
						<SheetTitle>{title}</SheetTitle>
						<SheetDescription>{description}</SheetDescription>
					</SheetHeader>
					<div className="min-h-0 flex-1 overflow-auto">{children}</div>
				</SheetContent>
			) : mounted && slot ? (
				createPortal(
					<aside
						id={id}
						aria-label={label}
						data-state={expanded ? "open" : "closed"}
						className={cn(
							"relative h-full transition-[width] duration-300 ease-out motion-reduce:transition-none",
							expanded ? "w-(--sidebar-width)" : "w-0",
						)}
					>
						<Sidebar
							side={side}
							collapsible="none"
							// Pinned to the edge it shares with the map, so the panel slides
							// out from under the viewport edge as the map gets pushed aside.
							// What sticks out is clipped by the layout's `overflow-hidden`.
							className={cn(
								"absolute inset-y-0",
								side === "left" ? "right-0 border-r" : "left-0 border-l",
							)}
						>
							<SidebarHeader className="gap-1.5 p-4 pr-12">
								<h2 className="font-semibold">{title}</h2>
								<p className="text-sm text-muted-foreground">{description}</p>
								<Button
									variant="ghost"
									size="icon"
									className="absolute top-2 right-2"
									aria-label={label + " schließen"}
									onClick={() => {
										onOpenChange(false);
										triggerRef.current?.focus();
									}}
								>
									<X />
								</Button>
							</SidebarHeader>
							<SidebarContent>{children}</SidebarContent>
						</Sidebar>
					</aside>,
					slot,
				)
			) : null}
		</Sheet>
	);
}
