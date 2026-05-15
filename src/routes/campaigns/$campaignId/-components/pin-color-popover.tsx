import { Check } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import ColorWheel from "@/assets/color-wheel.svg";
import { colors } from "@/colors";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useAppStore } from "@/store/app-store";

export default function PinColorPopover() {
	const { pinColor } = useAppStore(
		useShallow((state) => ({
			pinColor: state.pinColor,
		})),
	);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					className={`shadow-md h-full p-2 transition-all ${colors[pinColor].bg}`}
					size="lg"
				>
					<img src={ColorWheel} alt="Color Wheel" className="size-6" />
				</Button>
			</PopoverTrigger>
			<PopoverContent>
				<PopoverHeader>
					<PopoverTitle>Farbwahl</PopoverTitle>
					<PopoverDescription>
						Wähle eine Farbe für dein Plakat aus.
					</PopoverDescription>
				</PopoverHeader>
				<div className="grid grid-cols-5 gap-2 py-2">
					{Object.keys(colors).map((color) => (
						<ColorButton key={color} color={color as keyof typeof colors} />
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}

function ColorButton({ color }: { color: keyof typeof colors }) {
	const { pinColor, setPinColor } = useAppStore(
		useShallow((state) => ({
			pinColor: state.pinColor,
			setPinColor: state.setPinColor,
		})),
	);

	return (
		<Button
			className={`size-10 ${colors[color].bg}`}
			onClick={() => setPinColor(color)}
		>
			{color === pinColor && (
				<Check className="stroke-3 rounded-full bg-muted text-muted-foreground size-4 p-0.5" />
			)}
		</Button>
	);
}
