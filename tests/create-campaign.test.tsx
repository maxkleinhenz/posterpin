// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn() }));
vi.mock("@/queries/campaigns", () => ({
	useAddCampaignMutation: () => ({ mutateAsync, isPending: false }),
}));
vi.mock("@/env", () => ({ env: { VITE_MAPTILER_KEY: "test" } }));
vi.mock("react-map-gl/maplibre", () => ({
	default: () => null,
	Marker: () => null,
}));
vi.mock("@tanstack/react-router", () => ({
	ClientOnly: ({ children }: PropsWithChildren) => children,
}));
vi.mock("@/components/ui/calendar", () => ({
	Calendar: ({ onSelect }: { onSelect: (date: Date) => void }) => (
		<button type="button" onClick={() => onSelect(new Date(2026, 8, 1))}>
			Testdatum wählen
		</button>
	),
}));
import { TooltipProvider } from "../src/components/ui/tooltip";
import CreateCampaign from "../src/routes/-components/create-campaign";

beforeEach(() => mutateAsync.mockReset().mockResolvedValue("campaign-id"));
afterEach(cleanup);

async function openForm() {
	render(
		<TooltipProvider>
			<CreateCampaign />
		</TooltipProvider>,
	);
	fireEvent.click(screen.getByRole("button", { name: /Neue Kampagne/ }));
	fireEvent.change(screen.getByLabelText("Name"), {
		target: { value: "Test" },
	});
}

it("clears a selected date without submitting the campaign", async () => {
	await openForm();
	fireEvent.click(
		screen.getByRole("button", { name: "Startdatum (optional)" }),
	);
	fireEvent.click(screen.getByRole("button", { name: "Testdatum wählen" }));
	fireEvent.keyDown(screen.getByRole("button", { name: "Testdatum wählen" }), {
		key: "Escape",
	});
	const clear = screen
		.getAllByRole("button", { name: "Datum entfernen" })
		.find((button) => !(button as HTMLButtonElement).disabled);
	expect(clear).toBeDefined();
	fireEvent.click(clear!);
	await new Promise((resolve) => setTimeout(resolve, 0));
	expect(mutateAsync).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole("button", { name: "Kampagne erstellen" }));
	await waitFor(() => expect(mutateAsync).toHaveBeenCalledOnce());
	expect(mutateAsync.mock.calls[0][0].startAt).toBeUndefined();
});

it("keeps entered data after a rejected submission and permits retry", async () => {
	mutateAsync.mockRejectedValueOnce(new Error("offline"));
	await openForm();
	fireEvent.click(screen.getByRole("button", { name: "Kampagne erstellen" }));
	await waitFor(() => expect(mutateAsync).toHaveBeenCalledOnce());
	expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe(
		"Test",
	);
	fireEvent.click(screen.getByRole("button", { name: "Kampagne erstellen" }));
	await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
});
