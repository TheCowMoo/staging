import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

interface DayHours {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

interface OperatingHoursSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const hour = Math.floor(i / 4);
  const minute = (i % 4) * 15;
  const ampm = hour < 12 ? "AM" : "PM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const displayMinute = minute.toString().padStart(2, "0");
  const value = `${hour.toString().padStart(2, "0")}:${displayMinute}`;
  return { value, label: `${displayHour}:${displayMinute} ${ampm}` };
});

export function OperatingHoursSelector({ value, onChange }: OperatingHoursSelectorProps) {
  const [hours, setHours] = useState<DayHours[]>(() => {
    // Parse existing value if any
    if (!value) {
      return DAYS.map(day => ({ day, open: "09:00", close: "17:00", closed: false }));
    }
    // Simple parsing - assume format like "Mon-Fri 9:00 AM - 5:00 PM"
    // For now, default to all days same
    return DAYS.map(day => ({ day, open: "09:00", close: "17:00", closed: false }));
  });

  const formatHours = (h: DayHours[]) => {
    // Group consecutive days with same hours
    const groups: { days: string[]; open: string; close: string; closed: boolean }[] = [];
    let current: { days: string[]; open: string; close: string; closed: boolean } | null = null;

    h.forEach((dayHours, i) => {
      if (!current || current.open !== dayHours.open || current.close !== dayHours.close || current.closed !== dayHours.closed) {
        current = { days: [dayHours.day.slice(0, 3)], open: dayHours.open, close: dayHours.close, closed: dayHours.closed };
        groups.push(current);
      } else {
        current.days.push(dayHours.day.slice(0, 3));
      }
    });

    return groups.map(g => {
      if (g.closed) return `${g.days.join('-')} Closed`;
      const openTime = formatTime(g.open);
      const closeTime = formatTime(g.close);
      return `${g.days.join('-')} ${openTime} - ${closeTime}`;
    }).join('; ');
  };

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    const ampm = hour < 12 ? 'AM' : 'PM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
  };

  useEffect(() => {
    onChange(formatHours(hours));
    // onChange may be recreated by the parent on every render, but we only need
    // to sync when the local hours state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours]);

  const updateDay = (index: number, updates: Partial<DayHours>) => {
    setHours(prev => prev.map((h, i) => i === index ? { ...h, ...updates } : h));
  };

  return (
    <div className="space-y-3">
      <Label>Operating Hours</Label>
      <div className="space-y-2">
        {hours.map((dayHours, index) => (
          <div key={dayHours.day} className="flex items-center gap-2">
            <span className="w-20 text-sm font-medium">{dayHours.day.slice(0, 3)}</span>
            {dayHours.closed ? (
              <span className="text-sm text-muted-foreground">Closed</span>
            ) : (
              <>
                <Select value={dayHours.open} onValueChange={(v) => updateDay(index, { open: v })}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">to</span>
                <Select value={dayHours.close} onValueChange={(v) => updateDay(index, { close: v })}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateDay(index, { closed: !dayHours.closed })}
            >
              {dayHours.closed ? "Open" : "Close"}
            </Button>
          </div>
        ))}
      </div>
      <div className="text-xs text-muted-foreground">
        Formatted: {formatHours(hours)}
      </div>
    </div>
  );
}