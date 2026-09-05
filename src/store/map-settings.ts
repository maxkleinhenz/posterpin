import { create } from "zustand";

export const mapStyles = [
	{ id: "streets", label: "Standard" },
	{ id: "dataviz-v4-light", label: "Hell" },
	{ id: "dataviz-v4-dark", label: "Dunkel" },
	{ id: "hybrid-v4", label: "Satellit" },
] as const;

export type MapStyle = (typeof mapStyles)[number]["id"];
export const defaultMapStyle: MapStyle = "streets";
const storageKey = "posterpin-map-style";

export function isMapStyle(value: unknown): value is MapStyle {
	return mapStyles.some((style) => style.id === value);
}

function readMapStyle(): MapStyle {
	try {
		const saved = localStorage.getItem(storageKey);
		return isMapStyle(saved) ? saved : defaultMapStyle;
	} catch {
		// Storage may be unavailable, including during server rendering.
		return defaultMapStyle;
	}
}

export function getMapStyleUrl(style: MapStyle, apiKey: string) {
	return `https://api.maptiler.com/maps/${style}/style.json?key=${apiKey}`;
}

export const useMapSettings = create<{
	mapStyle: MapStyle;
	setMapStyle: (style: MapStyle) => void;
}>((set) => ({
	mapStyle: readMapStyle(),
	setMapStyle: (mapStyle) => {
		set({ mapStyle });
		try {
			localStorage.setItem(storageKey, mapStyle);
		} catch {
			// Keep the selection usable when browser storage is disabled or full.
		}
	},
}));
