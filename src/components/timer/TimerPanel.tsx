import { useEffect, useState } from "react";
import { Play, Pause, RotateCcw, Square } from "../ui/icons";
import { useTimerStore } from "../../stores/timerStore";
import { useLiveTick } from "../../hooks/useLiveTick";
import { liveElapsedSeconds } from "../../utils/liveTime";
import { formatDuration } from "../../utils/format";
import { CircularProgress } from "./CircularProgress";

const PRESETS = [
  { label: "5 min", seconds: 5 * 60 },
  { label: "15 min", seconds: 15 * 60 },
  { label: "30 min", seconds: 30 * 60 },
  { label: "1 hora", seconds: 60 * 60 },
];

export function TimerPanel() {
  const { snapshot, load, start, pause, resume, restart, cancel, check } = useTimerStore();
  const [customMinutes, setCustomMinutes] = useState(25);
  const now = useLiveTick(250);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (snapshot?.status !== "running") return;
    const id = setInterval(() => check(), 1000);
    return () => clearInterval(id);
  }, [snapshot?.status, check]);

  const duration = snapshot?.durationSeconds ?? customMinutes * 60;
  const elapsed = snapshot
    ? liveElapsedSeconds(snapshot.status, snapshot.startedAt, snapshot.elapsedSeconds, now)
    : 0;
  const remaining = Math.max(0, duration - elapsed);
  const progress = duration > 0 ? elapsed / duration : 0;
  const finished = snapshot?.status === "completed";

  return (
    <div className="flex flex-col items-center py-8">
      <CircularProgress progress={snapshot ? progress : 0} size={240}>
        <div className="text-center">
          <p className={`text-4xl font-semibold tabular-nums ${finished ? "text-success" : "text-text-primary"}`}>
            {formatDuration(snapshot ? remaining : customMinutes * 60, true)}
          </p>
          {snapshot && (
            <p className="mt-1 text-xs uppercase tracking-wide text-text-muted">
              {finished ? "Concluído" : snapshot.status === "paused" ? "Pausado" : "Em andamento"}
            </p>
          )}
        </div>
      </CircularProgress>

      {!snapshot && (
        <>
          <div className="mt-6 flex gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                className="ff-btn-secondary text-xs"
                onClick={() => setCustomMinutes(preset.seconds / 60)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              min={1}
              className="ff-input w-24 text-center"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(Number(e.target.value))}
            />
            <span className="text-sm text-text-muted">minutos</span>
          </div>
          <button className="ff-btn-primary mt-5" onClick={() => start(customMinutes * 60)}>
            <Play size={16} /> Iniciar
          </button>
        </>
      )}

      {snapshot && (
        <div className="mt-6 flex gap-2">
          {snapshot.status === "running" && (
            <button className="ff-btn-secondary" onClick={pause}>
              <Pause size={16} /> Pausar
            </button>
          )}
          {snapshot.status === "paused" && (
            <button className="ff-btn-primary" onClick={resume}>
              <Play size={16} /> Continuar
            </button>
          )}
          <button className="ff-btn-secondary" onClick={restart}>
            <RotateCcw size={16} /> Reiniciar
          </button>
          <button className="ff-btn-danger" onClick={cancel}>
            <Square size={16} /> Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
