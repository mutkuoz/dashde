import { register } from "../lib/registry";
import { greeting } from "./greeting";
import { clock } from "./clock";
import { machine } from "./machine";
import { connection } from "./connection";
import { tasks } from "./tasks";
import { notes } from "./notes";
import { tmux } from "./tmux";
import { quick_launch } from "./quick_launch";
import { shell_output } from "./shell_output";
import { weather } from "./weather";
import {
  cpuWidget,
  memoryWidget,
  gpuWidget,
  diskWidget,
  batteryWidget,
} from "./individual_stats";
import {
  wifiWidget,
  bandwidthWidget,
  pingWidget,
  tailscaleWidget,
  publicIpWidget,
} from "./individual_connection";
import { sensorsWidget } from "./sensors";
import { calendarWidget } from "./calendar";
import { pomodoroWidget } from "./pomodoro";
import { mediaWidget } from "./media";

/** Register built-ins. Adding a new widget type = add file, add one line here. */
export function registerBuiltins(): void {
  register("greeting", greeting);
  register("clock", clock);

  register("machine", machine);
  register("cpu", cpuWidget);
  register("memory", memoryWidget);
  register("gpu", gpuWidget);
  register("disk", diskWidget);
  register("battery", batteryWidget);
  register("sensors", sensorsWidget);

  register("connection", connection);
  register("wifi", wifiWidget);
  register("bandwidth", bandwidthWidget);
  register("ping", pingWidget);
  register("tailscale", tailscaleWidget);
  register("public_ip", publicIpWidget);

  register("tasks", tasks);
  register("notes", notes);
  register("quick_launch", quick_launch);
  register("tmux", tmux);
  register("shell_output", shell_output);
  register("journalctl", shell_output); // preset alias — user provides `command: journalctl -u foo -n 20`

  register("weather", weather);
  register("calendar", calendarWidget);
  register("pomodoro", pomodoroWidget);
  register("media", mediaWidget);
}
