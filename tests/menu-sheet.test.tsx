import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import type { Id } from "../convex/_generated/dataModel";
import type { Campaign, Pin } from "../convex/schema";

const { requests } = vi.hoisted(() => ({
	requests: [] as { id: string; resolve: () => void; reject: () => void }[],
}));
vi.mock("convex/react", () => ({
	useMutation: () => {
		const mutate = ({ id }: { id: string }) =>
			new Promise<void>((resolve, reject) => {
				requests.push({
					id,
					resolve,
					reject: () => reject(new Error("Save failed")),
				});
			});
		return Object.assign(mutate, { withOptimisticUpdate: () => mutate });
	},
}));
const viewport = vi.hoisted(() => ({ small: false }));
vi.mock("@uidotdev/usehooks", () => ({ useMediaQuery: () => viewport.small }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => viewport.small }));
vi.mock("@/env", () => ({ env: { VITE_MAPTILER_KEY: "test" } }));
const map = vi.hoisted(() => ({
	flyTo: vi.fn(),
	getZoom: () => 16,
	getContainer: () => ({ clientHeight: 800 }),
	resize: vi.fn(),
	panBy: vi.fn(),
	unproject: () => ({ lng: 13, lat: 51 }),
	project: () => ({ x: 0, y: 0 }),
}));
vi.mock("react-map-gl/maplibre", () => ({ useMap: () => ({ current: map }) }));
vi.mock("@/components/ui/scroll-area", () => ({
	VirtualScrollArea: ({
		items,
		renderItem,
	}: {
		items: Pin[];
		renderItem: (pin: Pin) => ReactNode;
	}) =>
		items.map((pin) => (
			<div key={pin._id} data-testid={pin._id}>
				{renderItem(pin)}
			</div>
		)),
}));

import { TooltipProvider } from "../src/components/ui/tooltip";
import { pinQueries } from "../src/queries/pins";
import {
	MapSheetLayout,
	MapViewport,
} from "../src/routes/campaigns/$campaignId/-components/map-sheet-layout";
import MenuSheet from "../src/routes/campaigns/$campaignId/-components/menu-sheet";
import PinSettingsPopup from "../src/routes/campaigns/$campaignId/-components/pin-settings";
import { defaultFilter, useAppStore } from "../src/store/app-store";

const campaign: Campaign = {
	_id: "campaign-id" as Id<"campaigns">,
	_creationTime: 1,
	name: "Test",
	latitude: 51,
	longitude: 13,
};
let client: QueryClient;
beforeEach(() => {
	requests.length = 0;
	map.flyTo.mockClear();
	viewport.small = false;
	vi.stubGlobal(
		"ResizeObserver",
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	);
	client = new QueryClient({
		defaultOptions: {
			queries: { staleTime: Infinity, queryFn: async () => [] },
			mutations: { retry: false },
		},
	});
	useAppStore.setState({ mode: { mode: "none" }, pinFilter: defaultFilter });
});
afterEach(() => {
	cleanup();
	client.clear();
	vi.unstubAllGlobals();
});

it.each([false, true])(
	"keeps all pending rows disabled with mixed actions=%s",
	async (mixed) => {
		const pins: Pin[] = ["a", "b", "c"].map((id) => ({
			_id: id as Id<"pins">,
			_creationTime: 1,
			campaignId: campaign._id,
			latitude: 51,
			longitude: 13,
			color: "yellow",
			hangAt: mixed && id === "b" ? null : 1,
			tookDownAt: null,
		}));
		client.setQueryData(pinQueries.list(campaign._id).queryKey, pins);
		render(
			<QueryClientProvider client={client}>
				<TooltipProvider>
					<MapSheetLayout>
						<MenuSheet campaign={campaign} />
					</MapSheetLayout>
				</TooltipProvider>
			</QueryClientProvider>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Menü" }));
		const action = (id: string) =>
			within(screen.getByTestId(id)).getByRole("button", {
				name: mixed && id === "b" ? "Jetzt aufhängen" : "Plakat abhängen",
			}) as HTMLButtonElement;
		fireEvent.click(action("a"));
		await waitFor(() => expect(action("a").disabled).toBe(true));
		fireEvent.click(action("b"));
		await waitFor(() => expect(requests).toHaveLength(2));
		await waitFor(() => {
			expect(action("a").disabled).toBe(true);
			expect(action("b").disabled).toBe(true);
			expect(action("c").disabled).toBe(false);
		});
		// The latest call finishing must not unlock an older pending call.
		await act(async () => requests[1].resolve());
		await waitFor(() => {
			expect(action("b").disabled).toBe(false);
			expect(action("a").disabled).toBe(true);
		});
		fireEvent.click(action("a"));
		expect(requests).toHaveLength(2);
		await act(async () => requests[0].reject());
		await waitFor(() => expect(action("a").disabled).toBe(false));
		// A failed action is available for retry.
		fireEvent.click(action("a"));
		await waitFor(() => expect(requests).toHaveLength(3));
		await act(async () => requests[2].resolve());
	},
);

function renderSheet(settings: boolean) {
	return render(
		<QueryClientProvider client={client}>
			<TooltipProvider>
				<MapSheetLayout>
					{settings ? <PinSettingsPopup /> : <MenuSheet campaign={campaign} />}
				</MapSheetLayout>
				<button>Outside</button>
			</TooltipProvider>
		</QueryClientProvider>,
	);
}

it.each([false, true])(
	"opens a docked desktop sidebar until explicitly closed (settings=%s)",
	async (settings) => {
		const name = settings ? "Einstellungen" : "Menü";
		renderSheet(settings);
		const trigger = screen.getByRole("button", { name });
		fireEvent.click(trigger);
		const panel = screen.getByRole("complementary", { name });
		const slot = document.querySelector(
			settings
				? '[data-slot="map-panel-right"]'
				: '[data-slot="map-panel-left"]',
		)!;
		expect(panel.parentElement).toBe(slot);
		expect(panel.querySelector('[data-slot="sidebar"]')).toBeTruthy();
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(screen.queryByRole("button", { name: /anheften|lösen/ })).toBeNull();
		expect(trigger.getAttribute("aria-expanded")).toBe("true");
		expect(document.body.style.pointerEvents).not.toBe("none");
		fireEvent.pointerDown(screen.getByRole("button", { name: "Outside" }));
		fireEvent.focusIn(screen.getByRole("button", { name: "Outside" }));
		fireEvent.keyDown(document, { key: "Escape" });
		expect(screen.getByRole("complementary", { name })).toBe(panel);
		if (settings) {
			fireEvent.click(screen.getByRole("button", { name: "Planen" }));
			expect(useAppStore.getState().mode.mode).toBe("planning");
			expect(screen.getByRole("complementary", { name })).toBe(panel);
		}
		fireEvent.click(screen.getByRole("button", { name: name + " schließen" }));
		expect(document.activeElement).toBe(trigger);
		// The panel stays mounted while it slides shut.
		expect(screen.getByRole("complementary", { name }).dataset.state).toBe(
			"closed",
		);
		await waitFor(() =>
			expect(screen.queryByRole("complementary", { name })).toBeNull(),
		);
		expect(slot.childElementCount).toBe(0);
		fireEvent.click(trigger);
		expect(screen.getByRole("complementary", { name })).toBeTruthy();
		fireEvent.click(trigger);
		await waitFor(() =>
			expect(screen.queryByRole("complementary", { name })).toBeNull(),
		);
	},
);

it.each([false, true])(
	"switches an open desktop sidebar to a non-modal mobile sheet (settings=%s)",
	(settings) => {
		const name = settings ? "Einstellungen" : "Menü";
		const view = renderSheet(settings);
		fireEvent.click(screen.getByRole("button", { name }));
		viewport.small = true;
		view.rerender(
			<QueryClientProvider client={client}>
				<TooltipProvider>
					<MapSheetLayout>
						{settings ? (
							<PinSettingsPopup />
						) : (
							<MenuSheet campaign={campaign} />
						)}
					</MapSheetLayout>
				</TooltipProvider>
			</QueryClientProvider>,
		);
		expect(screen.queryByRole("complementary")).toBeNull();
		expect(screen.getByRole("dialog")).toBeTruthy();
		expect(document.querySelector('[data-slot="sheet-overlay"]')).toBeNull();
		expect(document.body.style.pointerEvents).not.toBe("none");
		expect(
			document.querySelector('[data-slot="map-panel-left"]')!.childElementCount,
		).toBe(0);
		expect(
			document.querySelector('[data-slot="map-panel-right"]')!
				.childElementCount,
		).toBe(0);
		fireEvent.click(screen.getByRole("button", { name: "Close" }));
		expect(screen.queryByRole("dialog")).toBeNull();
	},
);

it("opens and closes both sidebars independently", async () => {
	render(
		<QueryClientProvider client={client}>
			<TooltipProvider>
				<MapSheetLayout>
					<MenuSheet campaign={campaign} />
					<PinSettingsPopup />
				</MapSheetLayout>
			</TooltipProvider>
		</QueryClientProvider>,
	);
	fireEvent.click(screen.getByRole("button", { name: "Menü" }));
	fireEvent.click(screen.getByRole("button", { name: "Einstellungen" }));
	expect(screen.getAllByRole("complementary")).toHaveLength(2);
	fireEvent.click(
		screen.getByRole("button", { name: "Einstellungen schließen" }),
	);
	await waitFor(() =>
		expect(
			screen.queryByRole("complementary", { name: "Einstellungen" }),
		).toBeNull(),
	);
	expect(screen.getByRole("complementary", { name: "Menü" })).toBeTruthy();
});

it("holds the map viewport still while a sidebar slides", async () => {
	render(
		<QueryClientProvider client={client}>
			<TooltipProvider>
				<MapSheetLayout>
					<MapViewport>
						<div />
					</MapViewport>
					<MenuSheet campaign={campaign} />
				</MapSheetLayout>
			</TooltipProvider>
		</QueryClientProvider>,
	);
	const viewport = document.querySelector<HTMLElement>(
		'[data-slot="map-viewport"]',
	)!;
	Object.defineProperty(
		document.querySelector('[data-slot="sidebar-wrapper"]')!,
		"clientWidth",
		{ value: 1000, configurable: true },
	);

	fireEvent.click(screen.getByRole("button", { name: "Menü" }));
	// A fixed box keeps MapLibre from reallocating its canvas on every frame.
	expect(viewport.style.width).toBe("1000px");
	expect(viewport.style.right).toBe("0px");
	await waitFor(() => expect(viewport.style.width).toBe(""));
	expect(viewport.style.right).toBe("");
});

it.each([false, true])(
	"opens poster details with the correct menu behavior (mobile=%s)",
	(mobile) => {
		viewport.small = mobile;
		const pin: Pin = {
			_id: "detail-pin" as Id<"pins">,
			_creationTime: 1,
			campaignId: campaign._id,
			latitude: 51,
			longitude: 13,
			color: "yellow",
			hangAt: 1,
			tookDownAt: null,
		};
		client.setQueryData(pinQueries.list(campaign._id).queryKey, [pin]);
		renderSheet(false);
		fireEvent.click(screen.getByRole("button", { name: "Menü" }));
		fireEvent.click(screen.getByRole("button", { name: "Zentriere Plakat" }));
		expect(map.flyTo).toHaveBeenCalledWith({
			center: { lat: 51, lng: 13 },
			zoom: 18,
			padding: { top: 0, bottom: mobile ? 520 : 0, left: 0, right: 0 },
		});
		fireEvent.click(screen.getByRole("button", { name: "Plakatdetails" }));
		expect(useAppStore.getState().mode).toEqual({
			mode: "focused-pin",
			focusedPin: { id: pin._id },
		});
		if (mobile) {
			expect(screen.queryByRole("dialog")).toBeNull();
		} else {
			expect(screen.getByRole("complementary", { name: "Menü" })).toBeTruthy();
			fireEvent.click(screen.getByRole("button", { name: "Menü schließen" }));
			expect(useAppStore.getState().mode.mode).toBe("focused-pin");
		}
	},
);
