export const colors = {
	yellow: {
		rgb: "#f1c40f",
		bg: "bg-[#f1c40f] hover:bg-[#f1c40f]/90",
		text: "text-black",
	},
	orange: {
		rgb: "#e67e22",
		bg: "bg-[#e67e22] hover:bg-[#e67e22]/90",
		text: "text-white",
	},
	red: {
		rgb: "#c0392b",
		bg: "bg-[#c0392b] hover:bg-[#c0392b]/90",
		text: "text-white",
	},
	pink: {
		rgb: "#f3c5ff",
		bg: "bg-[#f3c5ff] hover:bg-[#f3c5ff]/90",
		text: "text-black",
	},
	purple: {
		rgb: "#8e44ad",
		bg: "bg-[#8e44ad] hover:bg-[#8e44ad]/90",
		text: "text-white",
	},
	blue: {
		rgb: "#3498db",
		bg: "bg-[#3498db] hover:bg-[#3498db]/90",
		text: "text-white",
	},
	darkblue: {
		rgb: "#2c3e50",
		bg: "bg-[#2c3e50] hover:bg-[#2c3e50]/90",
		text: "text-white",
	},
	darkgreen: {
		rgb: "#16a085",
		bg: "bg-[#16a085] hover:bg-[#16a085]/90",
		text: "text-white",
	},
	lightgreen: {
		rgb: "#2ecc71",
		bg: "bg-[#2ecc71] hover:bg-[#2ecc71]/90",
		text: "text-black",
	},
	gray: {
		rgb: "#95a5a6",
		bg: "bg-[#95a5a6] hover:bg-[#95a5a6]/90",
		text: "text-white",
	},
} as const;

export type PinColor = keyof typeof colors;
