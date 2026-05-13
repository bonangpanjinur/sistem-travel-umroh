/** KEP-FIX8 — Export ICS untuk integrasi Google/Apple Calendar */
export interface IcsEvent {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string;
}

const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function buildIcs(events: IcsEvent[], calName = "Vinstour Travel"): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//VinstourTravel//id//EN",
    `X-WR-CALNAME:${calName}`,
  ];
  for (const ev of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${ev.uid}`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(ev.start)}`,
      `DTEND:${fmt(ev.end)}`,
      `SUMMARY:${(ev.summary || "").replace(/\n/g, " ")}`,
      ev.description ? `DESCRIPTION:${ev.description.replace(/\n/g, "\\n")}` : "",
      ev.location ? `LOCATION:${ev.location}` : "",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n");
}

export function downloadIcs(events: IcsEvent[], filename = "jadwal.ics"): void {
  const blob = new Blob([buildIcs(events)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}