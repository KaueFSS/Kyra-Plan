import { useEffect } from "react";
import { Play, Pause, RotateCcw, Flag } from "../ui/icons";
import { useStopwatchStore } from "../../stores/stopwatchStore";
import { useLiveTick } from "../../hooks/useLiveTick";
import { liveElapsedSeconds } from "../../utils/liveTime";
import { formatStopwatch } from "../../utils/format";

export function StopwatchPanel() {
  const { snapshot, load, start, pause, resume, cancel, lap } = useStopwatchStore();
  const now = useLiveTick(50);

  useEffect(() => {
    load();
  }, [load]);

  const elapsedSeconds = snapshot
    ? liveElapsedSeconds(snapshot.status, snapshot.startedAt, snapshot.elapsedSeconds, now)
    : 0;
  const laps = snapshot?.laps ?? [];

  return (
    <div className="flex flex-col items-center py-8">
      <p className="text-5xl font-semibold tabular-nums text-text-primary">{formatStopwatch(elapsedSeconds * 1000)}</p>

      <div className="mt-6 flex gap-2">
        {!snapshot && (
          <button className="ff-btn-primary" onClick={start}>
            <Play size={16} /> Iniciar
          </button>
        )}
        {snapshot?.status === "running" && (
          <>
            <button className="ff-btn-secondary" onClick={lap}>
              <Flag size={16} /> Volta
            </button>
            <button className="ff-btn-secondary" onClick={pause}>
              <Pause size={16} /> Pausar
            </button>
          </>
        )}
        {snapshot?.status === "paused" && (
          <button className="ff-btn-primary" onClick={resume}>
            <Play size={16} /> Continuar
          </button>
        )}
        {snapshot && (
          <button className="ff-btn-secondary" onClick={cancel}>
            <RotateCcw size={16} /> Zerar
          </button>
        )}
      </div>

      {laps.length > 0 && (
        <div className="mt-6 w-full max-w-xs space-y-1">
          {laps
            .slice()
            .reverse()
            .map((lapMs, index) => (
              <div key={laps.length - index} className="flex justify-between rounded-lg bg-surface-2 px-3 py-1.5 text-sm">
                <span className="text-text-muted">Volta {laps.length - index}</span>
                <span className="tabular-nums text-text-primary">{formatStopwatch(lapMs)}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
