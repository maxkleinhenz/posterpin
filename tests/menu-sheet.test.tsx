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
vi.mock("@uidotdev/usehooks", () => ({ useMediaQuery: () => false }));
vi.mock("react-map-gl/maplibre", () => ({ useMap: () => ({}) }));
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
import MenuSheet from "../src/routes/campaigns/$campaignId/-components/menu-sheet";
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
					<MenuSheet campaign={campaign} />
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
