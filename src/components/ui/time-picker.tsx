import * as React from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface TimePickerProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
}

export function TimePicker({ date, setDate }: TimePickerProps) {
  const minuteRef = React.useRef<HTMLInputElement>(null)
  const hourRef = React.useRef<HTMLInputElement>(null)
  const [period, setPeriod] = React.useState<"AM" | "PM">("AM")

  React.useEffect(() => {
    if (date) {
      const hours = date.getHours()
      setPeriod(hours >= 12 ? "PM" : "AM")
    }
  }, [date])

  const setHours = (value: string) => {
    if (!date) return
    const hours = parseInt(value)
    if (isNaN(hours) || hours < 1 || hours > 12) return

    const newDate = new Date(date)
    let finalHours = hours
    if (period === "PM" && hours !== 12) finalHours += 12
    if (period === "AM" && hours === 12) finalHours = 0
    newDate.setHours(finalHours)
    setDate(newDate)
  }

  const setMinutes = (value: string) => {
    if (!date) return
    const minutes = parseInt(value)
    if (isNaN(minutes) || minutes < 0 || minutes > 59) return

    const newDate = new Date(date)
    newDate.setMinutes(minutes)
    setDate(newDate)
  }

  const togglePeriod = () => {
    if (!date) return
    const newDate = new Date(date)
    const currentHours = newDate.getHours()
    if (period === "AM") {
      newDate.setHours(currentHours + 12)
      setPeriod("PM")
    } else {
      newDate.setHours(currentHours - 12)
      setPeriod("AM")
    }
    setDate(newDate)
  }

  const getDisplayHours = () => {
    if (!date) return ""
    const hours = date.getHours()
    if (hours === 0) return "12"
    if (hours > 12) return (hours - 12).toString()
    return hours.toString()
  }

  const getDisplayMinutes = () => {
    if (!date) return ""
    return date.getMinutes().toString().padStart(2, "0")
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-center gap-1">
        <Label htmlFor="tp-hours" className="text-[11px] font-medium text-gray-500">
          Hour
        </Label>
        <Input
          id="tp-hours"
          className="w-14 h-9 text-center text-sm rounded-lg border-gray-200 bg-gray-50 focus:bg-white"
          value={getDisplayHours()}
          onChange={(e) => setHours(e.target.value)}
          ref={hourRef}
          maxLength={2}
          disabled={!date}
        />
      </div>
      <span className="text-gray-400 font-medium mt-5">:</span>
      <div className="flex flex-col items-center gap-1">
        <Label htmlFor="tp-minutes" className="text-[11px] font-medium text-gray-500">
          Min
        </Label>
        <Input
          id="tp-minutes"
          className="w-14 h-9 text-center text-sm rounded-lg border-gray-200 bg-gray-50 focus:bg-white"
          value={getDisplayMinutes()}
          onChange={(e) => setMinutes(e.target.value)}
          ref={minuteRef}
          maxLength={2}
          disabled={!date}
        />
      </div>
      <div className="flex flex-col items-center gap-1">
        <Label htmlFor="tp-period" className="text-[11px] font-medium text-gray-500">
          &nbsp;
        </Label>
        <button
          id="tp-period"
          className="h-9 w-14 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6e6e73]/30 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          onClick={togglePeriod}
          disabled={!date}
          type="button"
        >
          {period}
        </button>
      </div>
    </div>
  )
}