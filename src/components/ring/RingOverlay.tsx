import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { AlarmClock, CheckCircle2, Timer as TimerIcon } from "../ui/icons";
import { playRingtone, type Ringtone } from "../../utils/ringtone";
import { useSettingsStore } from "../../stores/settingsStore";
import { useTaskStore } from "../../stores/taskStore";
import { useTimerStore } from "../../stores/timerStore";
import { classNames } from "../../utils/format";

interface RingPayload {
  kind: "alarm" | "timer" | "task";
  title: string;
  subtitle: string;
}

const SNOOZE_MINUTES = 5;

/**
 * The phone-clock experience: when the backend says an alarm/timer/timed
 * task went off, play a sound and cover the screen with a stop (and, for
 * alarms, snooze) prompt. Alarms loop until dismissed; timer and task
 * endings chime once.
 */
export function RingOverlay() {
  const [ring, setRing] = useState<RingPayload | null>(null);
  const sound = useRef<Ringtone | null>(null);
  const snoozeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = (payload: RingPayload) => {
    sound.current?.stop();
    const soundEnabled = payload.kind === "alarm" || (useSettingsStore.getState().settings?.timerSoundEnabled ?? true);
    sound.current = soundEnabled ? playRingtone(payload.kind === "alarm") : null;
    setRing(payload);
    // Keep the rest of the UI in sync with what just finished.
    if (payload.kind !== "alarm") {
      void useTaskStore.getState().loadAll();
      void useTimerStore.getState().load();
    }
  };

  useEffect(() => {
    const unlisten = listen<RingPayload>("ring", (event) => start(event.payload));
    return () => {
      void unlisten.then((fn) => fn());
      sound.current?.stop();
      if (snoozeTimer.current) clearTimeout(snoozeTimer.current);
    };
  }, []);

  const dismiss = () => {
    sound.current?.stop();
    sound.current = null;
    setRing(null);
  };

  const snooze = () => {
    const payload = ring;
    dismiss();
    if (!payload) return;
    snoozeTimer.current = setTimeout(() => start({ ...payload, subtitle: `Soneca · ${payload.subtitle}` }), SNOOZE_MINUTES * 60_000);
  };

  if (!ring) return null;

  const Icon = ring.kind === "alarm" ? AlarmClock : ring.kind === "timer" ? TimerIcon : CheckCircle2;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="ff-card w-[22rem] max-w-[90vw] p-6 text-center shadow-2xl">
        <span
          className={classNames(
            "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full",
            ring.kind === "task" ? "bg-success/15 text-success" : "animate-pulse bg-accent-500/15 text-accent-400",
          )}
        >
          <Icon size={30} />
        </span>
        <p className="text-xl font-semibold text-text-primary">{ring.title}</p>
        <p className="mt-1 text-sm text-text-secondary">{ring.subtitle}</p>

        <div className="mt-6 flex gap-2">
          {ring.kind === "alarm" && (
            <button className="ff-btn-secondary flex-1 py-2.5" onClick={snooze}>
              Soneca ({SNOOZE_MINUTES} min)
            </button>
          )}
          <button className="ff-btn-primary flex-1 py-2.5" onClick={dismiss} autoFocus>
            {ring.kind === "alarm" ? "Parar" : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
