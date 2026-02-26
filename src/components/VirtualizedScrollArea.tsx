import { useVirtualizer } from "@tanstack/react-virtual";
import * as React from "react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";

interface VirtualizedScrollAreaProps<T> {
	items: T[];
	renderItem: (item: T, index: number) => React.ReactNode;
	overscan?: number;
	estimateSize: (index: number) => number;
	getItemKey?: (index: number) => string | number;
	className?: string;
	initialScroll?: {
		index: number;
		clickAfterScroll: boolean;
	};
}

export interface VirtualizedScrollAreaRef {
	scrollToIndex: (
		index: number,
		options?: {
			align?: "start" | "center" | "end";
			behavior?: "auto" | "smooth";
		},
	) => void;
}

function VirtualizedScrollArea<T extends object>({
	items,
	renderItem,
	overscan = 5,
	estimateSize,
	getItemKey,
	initialScroll,
	className,
	...props
}: VirtualizedScrollAreaProps<T>) {
	const parentRef = React.useRef<HTMLDivElement>(null);

	const rowVirtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => parentRef.current,
		estimateSize: estimateSize,
		overscan,
		getItemKey: getItemKey || ((index) => index),
	});

	const virtualItems = rowVirtualizer.getVirtualItems();
	useEffect(() => {
		if (initialScroll == null) return;

		if (initialScroll?.index > -1) {
			rowVirtualizer.scrollToIndex(initialScroll.index, {
				align: "start",
				behavior: "auto",
			});

			if (initialScroll?.clickAfterScroll) {
				//need to wait for the scroll to be completed
				setTimeout(() => {
					const targetElement = parentRef.current?.querySelector(
						`[data-virtual-index="${initialScroll.index}"]`,
					);
					const renderedElement = targetElement?.children[0];
					if (renderedElement instanceof HTMLElement) {
						renderedElement.click();
					}
				}, 100);
			}
		}
	}, [initialScroll?.index, rowVirtualizer, initialScroll]);
	return (
		<ScrollArea
			// style={{ height: listHeight }}
			viewPortRef={parentRef}
			className={cn("overflow-auto", className)}
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

VirtualizedScrollArea.displayName = "VirtualizedScrollArea";

export { VirtualizedScrollArea };
