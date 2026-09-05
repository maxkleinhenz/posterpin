import { afterEach, describe, expect, it } from "vitest";

import { getPinStatus, normalizePinColor } from "../shared/pins";
import { colors } from "../src/colors";
import { defaultFilter, useAppStore } from "../src/store/app-store";

afterEach(() =>
	useAppStore.setState({
		pinFilter: defaultFilter,
		mode: { mode: "none" },
		pinColor: "yellow",
	}),
);

it("entering planning mode makes the chosen color and planned pins visible", () => {
	useAppStore.setState({
		pinColor: "blue",
		pinFilter: {
			...defaultFilter,
			planned: false,
			colors: Object.fromEntries(
				Object.keys(colors).map((color) => [color, false]),
			) as typeof defaultFilter.colors,
		},
	});
	useAppStore.getState().setMode({ mode: "planning" });
	const { pinFilter, pinColor } = useAppStore.getState();
	expect(pinFilter.planned).toBe(true);
	expect(pinFilter.colors[pinColor]).toBe(true);
});

it("classifies legacy missing timestamps consistently and normalizes unsupported colors", () => {
	expect(getPinStatus({})).toBe("planned");
	expect(getPinStatus({ hangAt: 100 })).toBe("hung");
	expect(getPinStatus({ tookDownAt: 200 })).toBe("tookDown");
	expect(normalizePinColor("constructor")).toBe("yellow");
});

function luminance(hex: string) {
	const values = hex
		.slice(1)
		.match(/../g)!
		.map((part) => parseInt(part, 16) / 255)
		.map((value) =>
			value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
		);
	return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}

describe("pin label contrast", () => {
	it.each(Object.entries(colors))(
		"%s has at least 4.5:1 text contrast",
		(_name, color) => {
			const value = luminance(color.rgb);
			expect(
				color.text === "text-white"
					? 1.05 / (value + 0.05)
					: (value + 0.05) / 0.05,
			).toBeGreaterThanOrEqual(4.5);
		},
	);
});
