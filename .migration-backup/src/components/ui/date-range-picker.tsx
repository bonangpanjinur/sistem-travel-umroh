import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { id as idLocale } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
}

export function DateRangePicker({
  className,
  date,
  setDate,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [numberOfMonths, setNumberOfMonths] = React.useState(2);

  // Adjust number of months based on screen size
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setNumberOfMonths(1);
      } else {
        setNumberOfMonths(2);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full sm:w-[280px] md:w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "dd MMM", { locale: idLocale })} -{" "}
                    {format(date.to, "dd MMM y", { locale: idLocale })}
                  </>
                ) : (
                  format(date.from, "dd MMM y", { locale: idLocale })
                )
              ) : (
                <span>Pilih rentang tanggal</span>
              )}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0" 
          align="start"
          side="bottom"
          sideOffset={8}
        >
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={(newDate) => {
              setDate(newDate);
              // Auto-close if both dates are selected
              if (newDate?.from && newDate?.to) {
                setIsOpen(false);
              }
            }}
            numberOfMonths={numberOfMonths}
            disabled={(date) => date > new Date()}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
