// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Id } from "../convex/_generated/dataModel";
import type { Pin } from "../convex/schema";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { mutate, move, campaignId } = vi.hoisted(() => ({
	mutate: vi.fn(),
	move: vi.fn(),
	campaignId: "campaign-id",
}));
vi.mock("@tanstack/react-router", () => ({
	useParams: () => ({ campaignId }),
}));
vi.mock("@/queries/pins", async (importOriginal) => {
	const original = await importOriginal<typeof import("../src/queries/pins")>();
	return {
		...original,
		useTakeDownPinMutation: () => ({ mutate, isPending: false }),
		useHangAgainPinMutation: () => ({ mutate, isPending: false }),
		useRemovePinMutation: () => ({ mutate, isPending: false }),
		useUpdatePinColorMutation: () => ({ mutate, isPending: false }),
		useUpdatePinPositionMutation: () => ({ mutate: move, isPending: false }),
	};
});
import PinDetailsSheet from "../src/routes/campaigns/$campaignId/-components/pin-details-sheet";
import { pinQueries } from "../src/queries/pins";
import { defaultFilter, useAppStore } from "../src/store/app-store";

const pin: Pin = {
	_id: "pin-id" as Id<"pins">,
	_creationTime: 1,
	campaignId: campaignId as Id<"campaigns">,
	latitude: 51,
	longitude: 13,
	color: "yellow",
	hangAt: null,
	tookDownAt: null,
};
let client: QueryClient;
const key = pinQueries.list(pin.campaignId).queryKey;

beforeEach(() => {
	mutate.mockReset();
	move.mockReset();
	client = new QueryClient({
		defaultOptions: { queries: { retry: false, queryFn: async () => [pin] } },
	});
	client.setQueryData(key, [pin]);
	useAppStore.setState({
		mode: { mode: "focused-pin", focusedPin: { id: pin._id } },
		pinFilter: defaultFilter,
	});
});
afterEach(() => {
	cleanup();
	client.clear();
	useAppStore.setState({ mode: { mode: "none" } });
});

function show() {
	render(
		<QueryClientProvider client={client}>
			<PinDetailsSheet />
		</QueryClientProvider>,
	);
}

it("shows the current color and status when live data changes or an optimistic change rolls back", async () => {
	show();
	expect(
		screen.getByRole("button", { name: "Farbe wählen: Gelb" }),
	).toBeDefined();
	act(() => {
		client.setQueryData(key, [{ ...pin, color: "blue", hangAt: 100 }]);
	});
	await waitFor(() =>
		expect(
			screen.getByRole("button", { name: "Farbe wählen: Blau" }),
		).toBeDefined(),
	);
	expect(screen.getByRole("button", { name: "Plakat abhängen" })).toBeDefined();
	act(() => {
		client.setQueryData(key, [pin]);
	});
	await waitFor(() =>
		expect(
			screen.getByRole("button", { name: "Farbe wählen: Gelb" }),
		).toBeDefined(),
	);
	expect(screen.getByRole("button", { name: "Jetzt aufhängen" })).toBeDefined();
});

it("keeps details open until the server confirms the action", () => {
	show();
	fireEvent.click(screen.getByRole("button", { name: "Jetzt aufhängen" }));
	expect(mutate).toHaveBeenCalledOnce();
	expect(useAppStore.getState().mode.mode).toBe("focused-pin");
	act(() => mutate.mock.calls[0][1].onSuccess());
	expect(useAppStore.getState().mode.mode).toBe("none");
});

it("allows planned-pin position changes through labeled form fields", () => {
	show();
	fireEvent.change(screen.getByLabelText("Breitengrad"), {
		target: { value: "52" },
	});
	fireEvent.change(screen.getByLabelText("Längengrad"), {
		target: { value: "14" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Position speichern" }));
	expect(move).toHaveBeenCalledWith(
		{ id: pin._id, latitude: 52, longitude: 14 },
		{ onSuccess: expect.any(Function) },
	);
});

it("refreshes unedited coordinates from live updates and rollbacks", async () => {
	show();
	const latitude = screen.getByLabelText("Breitengrad") as HTMLInputElement;
	const longitude = screen.getByLabelText("Längengrad") as HTMLInputElement;
	act(() => {
		client.setQueryData(key, [{ ...pin, latitude: 52, longitude: 14 }]);
	});
	await waitFor(() => {
		expect(latitude.value).toBe("52");
		expect(longitude.value).toBe("14");
	});
	act(() => client.setQueryData(key, [pin]));
	await waitFor(() => {
		expect(latitude.value).toBe("51");
		expect(longitude.value).toBe("13");
	});
});

it("preserves edits while other coordinates update and follows live data after saving", async () => {
	show();
	const latitude = screen.getByLabelText("Breitengrad") as HTMLInputElement;
	const longitude = screen.getByLabelText("Längengrad") as HTMLInputElement;
	fireEvent.change(latitude, { target: { value: "53" } });
	act(() => {
		client.setQueryData(key, [{ ...pin, latitude: 52, longitude: 14 }]);
	});
	await waitFor(() => expect(longitude.value).toBe("14"));
	expect(latitude.value).toBe("53");
	fireEvent.click(screen.getByRole("button", { name: "Position speichern" }));
	expect(move).toHaveBeenCalledWith(
		{ id: pin._id, latitude: 53, longitude: 14 },
		{ onSuccess: expect.any(Function) },
	);
	// A failed save leaves the draft available for retry.
	act(() => client.setQueryData(key, [pin]));
	await waitFor(() => expect(longitude.value).toBe("13"));
	expect(latitude.value).toBe("53");
	fireEvent.click(screen.getByRole("button", { name: "Position speichern" }));
	act(() => {
		client.setQueryData(key, [{ ...pin, latitude: 53 }]);
		move.mock.calls[1][1].onSuccess();
	});
	await waitFor(() => expect(latitude.value).toBe("53"));
	act(() => {
		client.setQueryData(key, [{ ...pin, latitude: 54, longitude: 15 }]);
	});
	await waitFor(() => {
		expect(latitude.value).toBe("54");
		expect(longitude.value).toBe("15");
	});
});

it("gives every color a name and announces the selected color", () => {
	show();
	fireEvent.click(screen.getByRole("button", { name: "Farbe wählen: Gelb" }));
	expect(
		screen.getByRole("button", { name: "Gelb" }).getAttribute("aria-pressed"),
	).toBe("true");
	expect(
		screen.getByRole("button", { name: "Blau" }).getAttribute("aria-pressed"),
	).toBe("false");
});
