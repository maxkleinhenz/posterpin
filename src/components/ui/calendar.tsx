import {
	DayPicker,
	MonthsDropdown,
	useDayPicker,
	YearsDropdown,
} from "react-day-picker";
import { cn } from "src/lib/utils";
import { buttonVariants } from "./button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;
const navButtonStyle = cn(
	buttonVariants({ variant: "outline", size: "icon" }),
	"h-8 w-8",
);
function Calendar({
	className,
	classNames,
	showOutsideDays = true,
	...props
}: CalendarProps) {
	// Default to 100 years in the past and 100 years in the future if no range is specified
	const defaultStartMonth =
		props.startMonth || new Date(new Date().getFullYear() - 100, 0, 1);
	const defaultEndMonth =
		props.endMonth || new Date(new Date().getFullYear() + 100, 11, 31);

	return (
		<DayPicker
			showOutsideDays={showOutsideDays}
			className={cn("p-3", className)}
			captionLayout="dropdown"
			startMonth={defaultStartMonth}
			endMonth={defaultEndMonth}
			components={{
				// biome-ignore lint/correctness/noNestedComponentDefinitions: <explanation>
				YearsDropdown: (props) => {
					const { classNames: yearsDropdownClassNames } = useDayPicker();
					yearsDropdownClassNames.caption_label = "hidden";

					return YearsDropdown({
						className:
							"w-24 p-2 border-2 rounded-md bg-primary text-primary-foreground",
						...props,
					});
				},
				// biome-ignore lint/correctness/noNestedComponentDefinitions: <explanation>
				MonthsDropdown: (props) => {
					const { classNames: monthsDropdownClassNames } = useDayPicker();
					monthsDropdownClassNames.caption_label = "hidden";
					return MonthsDropdown({
						className: "",
						...props,
					});
				},
			}}
			classNames={{
				dropdowns: "flex flex-row justify-center gap-2",
				dropdown:
					"bg-transparent outline-none cursor-pointer border rounded-md p-1",
				months: "relative flex flex-col sm:flex-row",
				month: "p-4 space-y-4",
				month_caption: "",
				caption_label: "text-sm font-medium",
				// nav: 'space-x-1 flex items-center absolute inset-0',
				button_previous: cn(navButtonStyle, "absolute left-0 top-4 z-10"),
				button_next: cn(navButtonStyle, "absolute right-0 top-4 z-10"),
				month_grid: "w-full border-collapse space-y-1",
				weekdays: "flex",
				weekday:
					"text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
				weeks: "grid gap-2",
				week: "flex w-max",
				day: "grid place-center h-9 w-9 text-sm hover:has-[button]:bg-primary hover:text-primary-foreground rounded-md aria-selected:bg-primary aria-selected:text-primary-foreground",
				range_start:
					"aria-selected:rounded-l-md has-[button]:bg-primary text-primary-foreground",
				range_end:
					"aria-selected:rounded-r-md has-[button]:bg-primary text-primary-foreground",
				range_middle: "has-[button]:bg-accent text-accent-foreground",
				// has-[button]:border-2 border-primary text-accent-foreground
				today: "",
				outside: "text-muted-foreground",
				disabled: "text-muted-foreground opacity-50",

				...classNames,
			}}
			{...props}
		/>
	);
}
Calendar.displayName = "Calendar";

export { Calendar };
