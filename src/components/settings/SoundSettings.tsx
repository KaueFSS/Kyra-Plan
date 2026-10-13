import { useState } from "react";
import { Play } from "../ui/icons";
import { Switch } from "../ui/Switch";
import { getSoundPrefs, playSound, setSoundPrefs, type SoundPrefs } from "../../utils/sounds";

/** Sound preferences apply instantly (no Save button needed). */
export function SoundSettings() {
  const [prefs, setPrefs] = useState<SoundPrefs>(getSoundPrefs);

  const change = (patch: Partial<SoundPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setSoundPrefs(next);
  };

  return (
    <div className="ff-card space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Sons</h3>
        <button
          className="ff-btn-ghost px-2.5 py-1 text-xs"
          onClick={() => {
            playSound("complete");
            setTimeout(() => playSound("add"), 380);
            setTimeout(() => playSound("celebrate"), 760);
          }}
          disabled={!prefs.enabled}
        >
          <Play size={12} /> Ouvir
        </button>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-text-secondary">Sons do app (concluir, adicionar, timer, dia completo)</span>
        <Switch checked={prefs.enabled} onChange={(on) => change({ enabled: on })} label="Sons do app" />
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-text-secondary">Clique ao apertar botões</span>
        <Switch checked={prefs.clicks} onChange={(on) => change({ clicks: on })} label="Clique nos botões" />
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-text-secondary">Volume</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={prefs.volume}
          disabled={!prefs.enabled}
          onChange={(e) => change({ volume: Number(e.target.value) })}
          onPointerUp={() => playSound("complete")}
          className="w-48 accent-[var(--color-accent-500)]"
          aria-label="Volume"
        />
      </div>
    </div>
  );
}
