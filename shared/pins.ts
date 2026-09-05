export const pinColorNames = [
	"yellow",
	"orange",
	"red",
	"pink",
	"purple",
	"blue",
	"darkblue",
	"darkgreen",
	"lightgreen",
	"gray",
] as const;

export type PinColor = (typeof pinColorNames)[number];

export function isPinColor(value: string): value is PinColor {
	return pinColorNames.some((color) => color === value);
}

export function normalizePinColor(value: string): PinColor {
	return isPinColor(value) ? value : "yellow";
}

export function getPinStatus(pin: {
	hangAt?: number | null;
	tookDownAt?: number | null;
}) {
	if (pin.tookDownAt != null) return "tookDown";
	return pin.hangAt != null ? "hung" : "planned";
}
