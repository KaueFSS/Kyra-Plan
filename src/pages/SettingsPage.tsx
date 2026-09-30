import { useEffect, useState } from "react";
import { useSettingsStore, settingsToUpdateInput } from "../stores/settingsStore";
import type { UpdateSettingsInput } from "../services/settingsService";
import { getDisplayName, setDisplayName } from "../utils/profile";
import { AboutSection } from "../components/update/AboutSection";

const TIMEZONES = [
  "America/Sao_Paulo",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Lisbon",
  "Asia/Tokyo",
  "UTC",
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ff-card p-5 space-y-4">
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-text-secondary">{label}</label>
      {children}
    </div>
  );
}

export function SettingsPage() {
  const { settings, load, update } = useSettingsStore();
  const [form, setForm] = useState<UpdateSettingsInput | null>(null);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(getDisplayName());

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (settings) setForm(settingsToUpdateInput(settings));
  }, [settings]);

  if (!form) return <div className="p-6 text-text-muted">Carregando...</div>;

  const set = <K extends keyof UpdateSettingsInput>(key: K, value: UpdateSettingsInput[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const save = async () => {
    if (!form) return;
    setDisplayName(name);
    await update(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <AboutSection />

      <Section title="Perfil">
        <Field label="Seu nome">
          <input className="ff-input w-48" value={name} onChange={(e) => setName(e.target.value)} placeholder="Você" />
        </Field>
      </Section>

      <Section title="Aparência">
        <Field label="Tema">
          <select className="ff-input" value={form.theme} onChange={(e) => set("theme", e.target.value)}>
            <option value="dark">Escuro</option>
            <option value="light">Claro</option>
          </select>
        </Field>
        <Field label="Densidade da interface">
          <select className="ff-input" value={form.uiDensity} onChange={(e) => set("uiDensity", e.target.value)}>
            <option value="comfortable">Confortável</option>
            <option value="compact">Compacta</option>
          </select>
        </Field>
      </Section>

      <Section title="Data e hora">
        <Field label="Formato de hora">
          <select className="ff-input" value={form.timeFormat} onChange={(e) => set("timeFormat", e.target.value)}>
            <option value="24h">24 horas</option>
            <option value="12h">12 horas (AM/PM)</option>
          </select>
        </Field>
        <Field label="Primeiro dia da semana">
          <select className="ff-input" value={form.weekStart} onChange={(e) => set("weekStart", e.target.value)}>
            <option value="monday">Segunda-feira</option>
            <option value="sunday">Domingo</option>
          </select>
        </Field>
        <Field label="Fuso horário padrão">
          <select className="ff-input" value={form.timezone} onChange={(e) => set("timezone", e.target.value)}>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Tarefas">
        <Field label="Horário de reset diário">
          <input
            type="time"
            className="ff-input"
            value={form.dailyResetTime}
            onChange={(e) => set("dailyResetTime", e.target.value)}
          />
        </Field>
        <Field label="Fuso do reset diário">
          <select
            className="ff-input"
            value={form.dailyResetTimezone}
            onChange={(e) => set("dailyResetTimezone", e.target.value)}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Notificações de tarefas">
          <input
            type="checkbox"
            checked={form.taskNotificationsEnabled}
            onChange={(e) => set("taskNotificationsEnabled", e.target.checked)}
          />
        </Field>
      </Section>

      <Section title="Timer">
        <Field label="Som ao concluir">
          <input
            type="checkbox"
            checked={form.timerSoundEnabled}
            onChange={(e) => set("timerSoundEnabled", e.target.checked)}
          />
        </Field>
        <Field label="Preset padrão (minutos)">
          <input
            type="number"
            min={1}
            className="ff-input w-24"
            value={Math.round(form.timerDefaultPresetSeconds / 60)}
            onChange={(e) => set("timerDefaultPresetSeconds", Number(e.target.value) * 60)}
          />
        </Field>
      </Section>

      <Section title="Aplicativo">
        <Field label="Iniciar com o Windows">
          <input
            type="checkbox"
            checked={form.launchOnStartup}
            onChange={(e) => set("launchOnStartup", e.target.checked)}
          />
        </Field>
        <Field label="Minimizar para a bandeja ao fechar">
          <input
            type="checkbox"
            checked={form.minimizeToTray}
            onChange={(e) => set("minimizeToTray", e.target.checked)}
          />
        </Field>
      </Section>

      <div className="flex items-center gap-3">
        <button className="ff-btn-primary" onClick={save}>
          Salvar alterações
        </button>
        {saved && <span className="text-sm text-success">Salvo!</span>}
      </div>
    </div>
  );
}
