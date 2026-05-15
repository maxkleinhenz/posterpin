import { Check } from "lucide-react";
import ColorWheel from "@/assets/color-wheel.svg";
import { colors, type PinColor } from "@/colors";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function PinColorPopover({
	selectedColor,
	onSelectColor,
	wheelClassName,
}: {
	selectedColor: PinColor;
	onSelectColor: (color: PinColor) => void;
	wheelClassName?: string;
}) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					className={`shadow-md h-full p-2 transition-all ${colors[selectedColor].bg}`}
					size="lg"
				>
					<img
						src={ColorWheel}
						alt="Color Wheel"
						className={cn("size-8", wheelClassName)}
					/>
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
						<ColorButton
							key={color}
							color={color as keyof typeof colors}
							selectedColor={selectedColor}
							onSelectColor={onSelectColor}
						/>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}

function ColorButton({
	color,
	selectedColor,
	onSelectColor,
}: {
	color: keyof typeof colors;
	selectedColor: PinColor;
	onSelectColor: (color: PinColor) => void;
}) {
	return (
		<Button
			className={`size-10 ${colors[color].bg}`}
			onClick={() => onSelectColor(color)}
		>
			{color === selectedColor && (
				<Check className="stroke-3 rounded-full bg-muted text-muted-foreground size-4 p-0.5" />
			)}
		</Button>
	);
}
