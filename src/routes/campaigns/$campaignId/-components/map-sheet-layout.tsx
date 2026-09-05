import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
	type CSSProperties,
	type ReactNode,
	type RefObject,
} from "react";
import { useMap } from "react-map-gl/maplibre";

import { SidebarProvider } from "@/components/ui/sidebar";

// How long a panel takes to slide. Keep in sync with the `duration-300` classes
// in `map-panel.tsx`.
export const PANEL_SLIDE_MS = 300;
// A panel is pinned from the toggle, but its transition only starts a frame or
// two later, so hold the viewport a little past the end of the slide.
const PIN_MS = PANEL_SLIDE_MS + 60;

type MapLayout = {
	left: HTMLDivElement | null;
	right: HTMLDivElement | null;
	viewportRef: RefObject<HTMLDivElement | null>;
	pinViewport: (side: "left" | "right") => void;
};

const MapLayoutContext = createContext<MapLayout | null>(null);

export function MapSheetLayout({ children }: { children: ReactNode }) {
	const [left, setLeft] = useState<HTMLDivElement | null>(null);
	const [right, setRight] = useState<HTMLDivElement | null>(null);

	const wrapperRef = useRef<HTMLDivElement>(null);
	const viewportRef = useRef<HTMLDivElement>(null);
	const pinnedRef = useRef<{ side: "left" | "right"; timer: number } | null>(
		null,
	);

	const maps = useMap();
	const map = maps?.current ?? maps?.default;

	// MapLibre reallocates its drawing buffer whenever the container changes
	// size, so a panel that drives the viewport width repaints the entire map on
	// every frame of its slide. Resize the viewport once per slide instead, and
	// put the view back where it was so the single resize stays invisible.
	const resizeKeepingView = useCallback(
		(before: DOMRect) => {
			const el = viewportRef.current;
			if (!el || !map || before.width === 0) return;
			const after = el.getBoundingClientRect();
			if (after.width === before.width && after.left === before.left) return;
			// These bracket the resize, so they read the old and the new transform.
			const anchor = map.unproject([before.width / 2, before.height / 2]);
			map.resize();
			const drift =
				after.left + map.project(anchor).x - (before.left + before.width / 2);
			if (Math.abs(drift) > 0.5) map.panBy([drift, 0], { duration: 0 });
		},
		[map],
	);

	const unpinViewport = useCallback(() => {
		const el = viewportRef.current;
		if (!el || !pinnedRef.current) return;
		clearTimeout(pinnedRef.current.timer);
		pinnedRef.current = null;
		const before = el.getBoundingClientRect();
		el.style.width = "";
		el.style.left = "";
		el.style.right = "";
		resizeKeepingView(before);
	}, [resizeKeepingView]);

	const pinViewport = useCallback(
		(side: "left" | "right") => {
			const el = viewportRef.current;
			const wrapper = wrapperRef.current;
			if (!el || !wrapper) return;
			const pinned = pinnedRef.current;
			// A second panel needs the opposite anchor, so hand the map back first
			// rather than dragging the pinned box along with that panel.
			if (pinned && pinned.side !== side) unpinViewport();

			if (!pinnedRef.current) {
				const other = side === "left" ? right : left;
				// The sliding panel ends at either zero or its full width, so the most
				// room the viewport can claim during the slide is the wrapper without
				// the panel on the other side.
				const width = wrapper.clientWidth - (other?.offsetWidth ?? 0);
				const before = el.getBoundingClientRect();
				el.style.width = `${width}px`;
				// Anchored away from the sliding panel, so the map holds its place on
				// screen while the panel covers or uncovers it.
				el.style.left = side === "left" ? "auto" : "0px";
				el.style.right = side === "left" ? "0px" : "auto";
				resizeKeepingView(before);
			} else {
				clearTimeout(pinnedRef.current.timer);
			}

			pinnedRef.current = {
				side,
				timer: window.setTimeout(unpinViewport, PIN_MS),
			};
		},
		[left, right, resizeKeepingView, unpinViewport],
	);

	const layout = useMemo<MapLayout>(
		() => ({ left, right, viewportRef, pinViewport }),
		[left, right, pinViewport],
	);

	return (
		<SidebarProvider
			ref={wrapperRef}
			keyboardShortcut={null}
			className="h-dvh min-h-0 overflow-hidden"
			style={{ "--sidebar-width": "min(24rem, 30vw)" } as CSSProperties}
		>
			<MapLayoutContext.Provider value={layout}>
				<div ref={setLeft} className="shrink-0" data-slot="map-panel-left" />
				<div
					className="relative h-full min-w-0 flex-1 overflow-hidden"
					data-slot="map-sheet-layout"
				>
					{children}
				</div>
				<div ref={setRight} className="shrink-0" data-slot="map-panel-right" />
			</MapLayoutContext.Provider>
		</SidebarProvider>
	);
}

// The box the map fills. It is sized by the layout rather than by `inset-0`
// alone, so that a sliding panel cannot resize the map canvas mid-animation.
export function MapViewport({ children }: { children: ReactNode }) {
	const { viewportRef } = useMapLayout();
	return (
		<div
			ref={viewportRef}
			data-slot="map-viewport"
			className="absolute inset-0"
		>
			{children}
		</div>
	);
}

function useMapLayout() {
	const layout = useContext(MapLayoutContext);
	if (!layout)
		throw new Error("Map panels must be rendered inside MapSheetLayout.");
	return layout;
}

export function useMapPanelSlot(side: "left" | "right") {
	const { left, right, pinViewport } = useMapLayout();
	return { slot: side === "left" ? left : right, pinViewport };
}
