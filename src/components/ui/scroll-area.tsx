import { useVirtualizer } from "@tanstack/react-virtual";
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "src/lib/utils";

const ScrollArea = React.forwardRef<
	React.ComponentRef<typeof ScrollAreaPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
		viewPortClassName?: string;
		orientation?: "vertical" | "horizontal";
		viewPortRef?: React.Ref<HTMLDivElement>;
	}
>(
	(
		{
			className,
			children,
			viewPortClassName,
			viewPortRef,
			orientation = "vertical",
			...props
		},
		ref,
	) => (
		<ScrollAreaPrimitive.Root
			data-slot="scroll-area"
			className={cn("relative", className)}
			ref={ref}
			{...props}
		>
			<ScrollAreaPrimitive.Viewport
				ref={viewPortRef}
				data-slot="scroll-area-viewport"
				className={cn(
					"focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1",
					viewPortClassName,
				)}
			>
				{children}
			</ScrollAreaPrimitive.Viewport>
			<ScrollBar orientation={orientation} />
			<ScrollAreaPrimitive.Corner />
		</ScrollAreaPrimitive.Root>
	),
);

ScrollArea.displayName = "ScrollArea";

function ScrollBar({
	className,
	orientation = "vertical",
	...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
	return (
		<ScrollAreaPrimitive.ScrollAreaScrollbar
			data-slot="scroll-area-scrollbar"
			orientation={orientation}
			className={cn(
				"flex touch-none p-px transition-colors select-none",
				orientation === "vertical" &&
					"h-full w-2.5 border-l border-l-transparent",
				orientation === "horizontal" &&
					"h-2.5 flex-col border-t border-t-transparent",
				className,
			)}
			{...props}
		>
			<ScrollAreaPrimitive.ScrollAreaThumb
				data-slot="scroll-area-thumb"
				className="bg-border relative flex-1 rounded-full"
			/>
		</ScrollAreaPrimitive.ScrollAreaScrollbar>
	);
}

interface VirtualScrollAreaProps<T> {
	items: T[];
	renderItem: (item: T, index: number) => React.ReactNode;
	overscan?: number;
	estimateSize: (index: number) => number;
	getItemKey?: (index: number) => string | number;
	className?: string;
	viewPortClassName?: string;
}

function VirtualScrollArea<T extends object>({
	items,
	renderItem,
	overscan = 5,
	estimateSize,
	getItemKey,
	className,
	viewPortClassName,
	...props
}: VirtualScrollAreaProps<T> &
	Omit<
		React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>,
		"children"
	>) {
	"use no memo";
	// Remove when TanStack Virtual supports React Compiler memoization.
	const parentRef = React.useRef<HTMLDivElement>(null);

	// This component opts out of compilation above; keep virtualizer reads local.
	// oxlint-disable-next-line react/incompatible-library
	const rowVirtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => parentRef.current,
		estimateSize,
		overscan,
		getItemKey: getItemKey ?? ((index) => index),
	});

	const virtualItems = rowVirtualizer.getVirtualItems();

	return (
		<ScrollArea
			viewPortRef={parentRef}
			className={cn("h-full min-h-0", className)}
			viewPortClassName={cn("min-h-0 overflow-y-auto", viewPortClassName)}
			{...props}
		>
			<div
				className="relative w-full"
				style={{
					height: `${rowVirtualizer.getTotalSize()}px`,
				}}
			>
				{virtualItems.map((virtualItem) => (
					<div
						key={virtualItem.key}
						data-virtual-index={virtualItem.index}
						className="absolute top-0 left-0 w-full"
						style={{
							height: `${virtualItem.size}px`,
							transform: `translateY(${virtualItem.start}px)`,
						}}
					>
						{renderItem(items[virtualItem.index], virtualItem.index)}
					</div>
				))}
			</div>
		</ScrollArea>
	);
}

VirtualScrollArea.displayName = "VirtualScrollArea";

export { ScrollArea, ScrollBar, VirtualScrollArea };
