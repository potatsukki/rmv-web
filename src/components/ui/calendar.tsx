import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months:
          "flex flex-col sm:flex-row gap-y-4 sm:gap-x-4 sm:gap-y-0",
        month: "flex flex-col gap-y-4",
        caption:
          "flex justify-center pt-1 relative items-center h-7",
        caption_label: "text-sm font-medium text-gray-900",
        nav: "flex items-center gap-x-1",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border-gray-200"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full [&]:block [&>thead]:block [&>tbody]:block",
        head_row: "grid grid-cols-7",
        head_cell:
          "text-center text-gray-500 font-normal text-[0.8rem]",
        row: "grid grid-cols-7 mt-2",
        cell: cn(
          "h-9 text-center text-sm p-0 relative",
          "focus-within:relative focus-within:z-20",
          "[&:has([aria-selected].day-range-end)]:rounded-r-md",
          "[&:has([aria-selected].day-outside)]:bg-gray-100/50",
          "[&:has([aria-selected])]:bg-gray-100",
          "dark:[&:has([aria-selected].day-outside)]:bg-white/[0.03]",
          "dark:[&:has([aria-selected])]:bg-transparent",
          "first:[&:has([aria-selected])]:rounded-l-md",
          "last:[&:has([aria-selected])]:rounded-r-md"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-slate-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-gray-900 text-white hover:bg-gray-900 hover:text-white focus:bg-gray-900 focus:text-white dark:border dark:border-[#d9bc76]/38 dark:bg-[radial-gradient(circle_at_top,rgba(255,243,208,0.22)_0%,rgba(214,179,106,0.18)_58%,rgba(120,82,26,0.34)_100%)] dark:text-[#fff4da] dark:shadow-[0_0_0_1px_rgba(217,188,118,0.18),inset_0_1px_0_rgba(255,246,218,0.16)] dark:hover:bg-[radial-gradient(circle_at_top,rgba(255,246,218,0.28)_0%,rgba(221,188,112,0.22)_58%,rgba(128,88,29,0.38)_100%)] dark:hover:text-[#fff8e8] dark:focus:bg-[radial-gradient(circle_at_top,rgba(255,246,218,0.28)_0%,rgba(221,188,112,0.22)_58%,rgba(128,88,29,0.38)_100%)] dark:focus:text-[#fff8e8]",
        day_today:
          "bg-[#f0f0f5] text-[#1d1d1f] font-semibold aria-selected:bg-gray-900 aria-selected:text-white dark:bg-white/[0.08] dark:text-slate-100 dark:aria-selected:border-[#d9bc76]/38 dark:aria-selected:bg-[radial-gradient(circle_at_top,rgba(255,243,208,0.22)_0%,rgba(214,179,106,0.18)_58%,rgba(120,82,26,0.34)_100%)] dark:aria-selected:text-[#fff4da]",
        day_outside:
          "day-outside text-gray-400 opacity-50 aria-selected:bg-gray-100/50 aria-selected:text-gray-500 aria-selected:opacity-30 dark:text-slate-600 dark:aria-selected:bg-white/[0.03] dark:aria-selected:text-slate-500",
        day_disabled: "text-gray-300 opacity-50 dark:text-slate-700",
        day_range_middle:
          "aria-selected:bg-gray-100 aria-selected:text-gray-900 dark:aria-selected:bg-white/[0.05] dark:aria-selected:text-slate-100",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }