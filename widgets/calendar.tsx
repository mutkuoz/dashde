import { Gtk } from "astal/gtk4";
import { bind } from "astal";
import type { WidgetConfig } from "../lib/config";
import type { WidgetModule } from "../lib/registry";
import { Panel } from "../lib/panel";
import { now } from "../services/time";

interface CalendarConfig extends WidgetConfig {
  title?: string;
  week_starts_on?: "monday" | "sunday";
}

const WEEKDAYS_MON = ["m", "t", "w", "t", "f", "s", "s"];
const WEEKDAYS_SUN = ["s", "m", "t", "w", "t", "f", "s"];

function monthGrid(d: Date, weekStartsOn: "monday" | "sunday"): (number | null)[][] {
  const year = d.getFullYear();
  const month = d.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0).getDate();

  // JS getDay: 0=Sun, 1=Mon ... 6=Sat
  let startCol = first.getDay();
  if (weekStartsOn === "monday") startCol = (startCol + 6) % 7;

  const grid: (number | null)[][] = [];
  let week: (number | null)[] = Array(startCol).fill(null);
  for (let day = 1; day <= last; day++) {
    week.push(day);
    if (week.length === 7) {
      grid.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    grid.push(week);
  }
  return grid;
}

export const calendarWidget: WidgetModule = {
  displayName: "Calendar",
  render(cfgIn) {
    const cfg = cfgIn as CalendarConfig;
    const starts = cfg.week_starts_on ?? "monday";
    const weekdays = starts === "monday" ? WEEKDAYS_MON : WEEKDAYS_SUN;

    const body = (
      <box orientation={Gtk.Orientation.VERTICAL} cssClasses={["calendar"]} spacing={2}>
        <label
          cssClasses={["calendar__month"]}
          halign={Gtk.Align.START}
          label={bind(now).as((d) =>
            d.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toLowerCase(),
          )}
        />
        <box orientation={Gtk.Orientation.HORIZONTAL} cssClasses={["calendar__head"]} homogeneous>
          {weekdays.map(
            (w) =>
              (
                <label cssClasses={["calendar__weekday"]} label={w} halign={Gtk.Align.CENTER} />
              ) as Gtk.Widget,
          )}
        </box>
        {bind(now).as((d) => {
          const grid = monthGrid(d, starts);
          const today = d.getDate();
          return grid.map(
            (week) =>
              (
                <box orientation={Gtk.Orientation.HORIZONTAL} homogeneous>
                  {week.map((day) => {
                    const classes = ["calendar__cell"];
                    if (day === today) classes.push("calendar__cell--today");
                    if (day === null) classes.push("calendar__cell--blank");
                    return (
                      <label
                        cssClasses={classes}
                        label={day === null ? "" : String(day)}
                        halign={Gtk.Align.CENTER}
                      />
                    ) as Gtk.Widget;
                  })}
                </box>
              ) as Gtk.Widget,
          );
        })}
      </box>
    );

    return <Panel title={cfg.title ?? "calendar"}>{body}</Panel>;
  },
};
