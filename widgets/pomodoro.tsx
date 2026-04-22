import { Gtk } from "astal/gtk4";
import { Variable, bind } from "astal";
import type { WidgetConfig } from "../lib/config";
import type { WidgetModule } from "../lib/registry";
import { Panel } from "../lib/panel";
import { readText, writeText } from "../lib/fs";
import { paths, ensureDir } from "../lib/paths";

interface PomodoroConfig extends WidgetConfig {
  focus_min?: number;
  break_min?: number;
  rounds?: number;
  title?: string;
}

type Phase = "focus" | "break" | "idle";

interface PomodoroState {
  phase: Phase;
  round: number;
  startedAt: number; // unix ms, 0 if idle
  elapsedBeforePause: number; // ms
  running: boolean;
}

const STATE_PATH = `${paths.data}/pomodoro.json`;

function loadState(): PomodoroState {
  const raw = readText(STATE_PATH);
  if (!raw) return { phase: "idle", round: 0, startedAt: 0, elapsedBeforePause: 0, running: false };
  try {
    return JSON.parse(raw) as PomodoroState;
  } catch {
    return { phase: "idle", round: 0, startedAt: 0, elapsedBeforePause: 0, running: false };
  }
}

function saveState(s: PomodoroState) {
  ensureDir(paths.data);
  writeText(STATE_PATH, JSON.stringify(s));
}

function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export const pomodoroWidget: WidgetModule = {
  displayName: "Pomodoro",
  render(cfgIn) {
    const cfg = cfgIn as PomodoroConfig;
    const focusMin = cfg.focus_min ?? 25;
    const breakMin = cfg.break_min ?? 5;
    const totalRounds = cfg.rounds ?? 4;

    const state = Variable<PomodoroState>(loadState());
    const remaining = Variable<number>(0); // seconds

    const tick = () => {
      const s = state.get();
      const phaseMs = s.phase === "focus" ? focusMin * 60_000 : breakMin * 60_000;
      const elapsed = s.running
        ? s.elapsedBeforePause + (Date.now() - s.startedAt)
        : s.elapsedBeforePause;
      const left = Math.max(0, Math.ceil((phaseMs - elapsed) / 1000));
      remaining.set(left);
      if (s.running && elapsed >= phaseMs) advance();
    };

    const advance = () => {
      const s = state.get();
      if (s.phase === "focus") {
        const nextRound = s.round + 1;
        const next: PomodoroState = {
          phase: nextRound >= totalRounds ? "idle" : "break",
          round: nextRound,
          startedAt: nextRound >= totalRounds ? 0 : Date.now(),
          elapsedBeforePause: 0,
          running: nextRound < totalRounds,
        };
        state.set(next);
        saveState(next);
      } else if (s.phase === "break") {
        const next: PomodoroState = {
          phase: "focus",
          round: s.round,
          startedAt: Date.now(),
          elapsedBeforePause: 0,
          running: true,
        };
        state.set(next);
        saveState(next);
      }
    };

    const start = () => {
      const s = state.get();
      const next: PomodoroState = {
        phase: s.phase === "idle" ? "focus" : s.phase,
        round: s.phase === "idle" ? 0 : s.round,
        startedAt: Date.now(),
        elapsedBeforePause: s.elapsedBeforePause,
        running: true,
      };
      state.set(next);
      saveState(next);
    };

    const pause = () => {
      const s = state.get();
      if (!s.running) return;
      const next: PomodoroState = {
        ...s,
        running: false,
        elapsedBeforePause: s.elapsedBeforePause + (Date.now() - s.startedAt),
        startedAt: 0,
      };
      state.set(next);
      saveState(next);
    };

    const reset = () => {
      const next: PomodoroState = {
        phase: "idle",
        round: 0,
        startedAt: 0,
        elapsedBeforePause: 0,
        running: false,
      };
      state.set(next);
      saveState(next);
    };

    // 500ms ticker — bind keeps re-renders limited to actual value changes
    setInterval(tick, 500);
    tick();

    const phaseText = bind(state).as((s) => {
      if (s.phase === "idle") return "ready";
      return `${s.phase} · round ${s.round + 1}/${totalRounds}`;
    });

    const timerText = bind(remaining).as(fmtDuration);
    const btnLabel = bind(state).as((s) => (s.running ? "pause" : s.phase === "idle" ? "start" : "resume"));

    return (
      <Panel title={cfg.title ?? "pomodoro"}>
        <box orientation={Gtk.Orientation.VERTICAL} cssClasses={["pomodoro"]} spacing={10}>
          <label cssClasses={["num-display"]} halign={Gtk.Align.START} label={timerText} />
          <label cssClasses={["muted"]} halign={Gtk.Align.START} label={phaseText} />
          <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
            <button
              cssClasses={["btn", "btn--primary"]}
              onClicked={() => (state.get().running ? pause() : start())}
            >
              <label label={btnLabel} />
            </button>
            <button cssClasses={["btn"]} onClicked={reset}>
              <label label="reset" />
            </button>
          </box>
        </box>
      </Panel>
    );
  },
};
