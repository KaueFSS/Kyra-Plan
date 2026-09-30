import type { ComponentType, ReactNode, SVGProps } from "react";

/**
 * SentUtility's own icon set. Every icon is drawn on a 24px grid with a firm,
 * round-capped stroke plus a soft filled "shadow" of the same colour behind
 * the shape (duotone) — so icons pick up whatever accent the user chose and
 * the app doesn't look like every other one using a stock icon pack.
 *
 * Drop-in API: `<Play size={16} className="..." />`, colour via `currentColor`.
 */
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "ref"> {
  size?: number | string;
  strokeWidth?: number | string;
}

export type IconType = ComponentType<IconProps>;

function icon(name: string, draw: () => ReactNode): IconType {
  const Component = ({ size = 16, strokeWidth = 1.9, className, ...rest }: IconProps) => (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ? `ff-icon ${className}` : "ff-icon"}
      {...rest}
    >
      {draw()}
    </svg>
  );
  Component.displayName = name;
  return Component;
}

/** The soft filled layer behind a shape. */
function Tone({ d, opacity = 0.34 }: { d: string; opacity?: number }) {
  return <path d={d} fill="currentColor" fillOpacity={opacity} stroke="none" />;
}

function Dot({ x, y, r = 1.3 }: { x: number; y: number; r?: number }) {
  return <circle cx={x} cy={y} r={r} fill="currentColor" stroke="none" />;
}

const DISC = "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z";
const CHECK = "M8.3 12.4l2.6 2.6 4.9-5.4";

// ── Actions ───────────────────────────────────────────────────────────────
export const Plus = icon("Plus", () => (
  <path d="M12 4.8v14.4M4.8 12h14.4" strokeWidth={2.1} />
));

export const X = icon("X", () => <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />);

export const Check = icon("Check", () => <path d="M5 12.6l4.6 4.6L19 7.4" />);

export const Pencil = icon("Pencil", () => (
  <>
    <Tone d="M4.5 19.5l1-4.2L15.8 5l3.2 3.2L8.7 18.5l-4.2 1z" />
    <path d="M4.5 19.5l1-4.2L15.8 5a1.6 1.6 0 0 1 2.2 0l1 1a1.6 1.6 0 0 1 0 2.2L8.7 18.5l-4.2 1zM14 7l3 3" />
  </>
));

export const Trash2 = icon("Trash2", () => (
  <>
    <Tone d="M6.8 8h10.4l-.8 10a2 2 0 0 1-2 1.8H9.6a2 2 0 0 1-2-1.8L6.8 8z" />
    <path d="M4.5 7.5h15M9.5 7.5V5.6c0-.6.4-1 1-1h3c.6 0 1 .4 1 1v1.9M7 8l.8 10a2 2 0 0 0 2 1.8h4.4a2 2 0 0 0 2-1.8L17 8M10.2 11.5v5M13.8 11.5v5" />
  </>
));

export const RotateCcw = icon("RotateCcw", () => (
  <>
    <path d="M4.6 12a7.4 7.4 0 1 0 2.3-5.4" />
    <path d="M4.4 4.6v4.2h4.2" />
  </>
));

export const Search = icon("Search", () => (
  <>
    <Tone d="M10.5 4.5a6 6 0 1 0 0 12 6 6 0 0 0 0-12z" />
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="M15 15l5 5" />
  </>
));

// ── Navigation ────────────────────────────────────────────────────────────
export const ChevronRight = icon("ChevronRight", () => <path d="M9.5 5.8l6 6.2-6 6.2" />);
export const ChevronLeft = icon("ChevronLeft", () => <path d="M14.5 5.8L8.5 12l6 6.2" />);
export const ArrowLeft = icon("ArrowLeft", () => <path d="M19.5 12H5.5M11 6l-5.5 6 5.5 6" />);

export const Home = icon("Home", () => (
  <>
    <Tone d="M4.5 11L12 4.5 19.5 11v8a1 1 0 0 1-1 1H15v-5H9v5H5.5a1 1 0 0 1-1-1v-8z" />
    <path d="M4 11.5L12 4.5l8 7M6 10v9a1 1 0 0 0 1 1h2.5v-5h5v5H17a1 1 0 0 0 1-1v-9" />
  </>
));

/** "Ajustes": three sliders instead of the usual cog. */
export const Settings = icon("Settings", () => (
  <>
    <circle cx="15" cy="7" r="2.4" fill="currentColor" fillOpacity={0.36} />
    <circle cx="8.5" cy="12" r="2.4" fill="currentColor" fillOpacity={0.36} />
    <circle cx="16.5" cy="17" r="2.4" fill="currentColor" fillOpacity={0.36} />
    <path d="M4 7h8.6M17.4 7H20M4 12h2.1M10.9 12H20M4 17h10.1M18.9 17H20" />
  </>
));

/** Colour: a swatch disc with three paint dots. */
export const Palette = icon("Palette", () => (
  <>
    <Tone d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.3-1.3-1.7-1.3-3 0-1 .8-1.8 1.9-1.8H17a4 4 0 0 0 4-4C21 6.8 17 3 12 3z" />
    <path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.3-1.3-1.7-1.3-3 0-1 .8-1.8 1.9-1.8H17a4 4 0 0 0 4-4C21 6.8 17 3 12 3z" />
    <Dot x={7.6} y={11.4} />
    <Dot x={10.2} y={7.6} />
    <Dot x={14.6} y={7.9} />
  </>
));

export const LayoutGrid = icon("LayoutGrid", () => (
  <>
    <rect x="4" y="4" width="7" height="7" rx="2.2" fill="currentColor" fillOpacity={0.36} />
    <rect x="13" y="13" width="7" height="7" rx="2.2" fill="currentColor" fillOpacity={0.36} />
    <rect x="13" y="4" width="7" height="7" rx="2.2" />
    <rect x="4" y="13" width="7" height="7" rx="2.2" />
  </>
));

export const GripVertical = icon("GripVertical", () => (
  <>
    <Dot x={9} y={6} r={1.4} />
    <Dot x={15} y={6} r={1.4} />
    <Dot x={9} y={12} r={1.4} />
    <Dot x={15} y={12} r={1.4} />
    <Dot x={9} y={18} r={1.4} />
    <Dot x={15} y={18} r={1.4} />
  </>
));

export const GripHorizontal = icon("GripHorizontal", () => (
  <>
    <Dot x={6} y={9} r={1.4} />
    <Dot x={12} y={9} r={1.4} />
    <Dot x={18} y={9} r={1.4} />
    <Dot x={6} y={15} r={1.4} />
    <Dot x={12} y={15} r={1.4} />
    <Dot x={18} y={15} r={1.4} />
  </>
));

// ── Media / time controls ─────────────────────────────────────────────────
export const Play = icon("Play", () => (
  <>
    <Tone d="M8 5.8v12.4a.9.9 0 0 0 1.4.8l9.4-6.2a.9.9 0 0 0 0-1.6L9.4 5A.9.9 0 0 0 8 5.8z" />
    <path d="M8 5.8v12.4a.9.9 0 0 0 1.4.8l9.4-6.2a.9.9 0 0 0 0-1.6L9.4 5A.9.9 0 0 0 8 5.8z" />
  </>
));

export const Pause = icon("Pause", () => (
  <>
    <rect x="6.5" y="5" width="3.8" height="14" rx="1.6" fill="currentColor" fillOpacity={0.36} />
    <rect x="13.7" y="5" width="3.8" height="14" rx="1.6" fill="currentColor" fillOpacity={0.36} />
    <rect x="6.5" y="5" width="3.8" height="14" rx="1.6" />
    <rect x="13.7" y="5" width="3.8" height="14" rx="1.6" />
  </>
));

export const Square = icon("Square", () => (
  <>
    <rect x="6" y="6" width="12" height="12" rx="3.2" fill="currentColor" fillOpacity={0.36} stroke="none" />
    <rect x="6" y="6" width="12" height="12" rx="3.2" />
  </>
));

export const Flag = icon("Flag", () => (
  <>
    <Tone d="M6.5 5.2h11.2l-2.3 3.8 2.3 3.8H6.5z" />
    <path d="M6.5 20.5V4M6.5 5.2h11.2l-2.3 3.8 2.3 3.8H6.5" />
  </>
));

export const Hourglass = icon("Hourglass", () => (
  <>
    <Tone d="M8.6 19.6c.4-2.6 1.7-3.6 3.4-5.6 1.7 2 3 3 3.4 5.6z" opacity={0.5} />
    <path d="M6.5 4h11M6.5 20h11M7.6 4c0 4 2.4 5.4 4.4 8-2 2.6-4.4 4-4.4 8M16.4 4c0 4-2.4 5.4-4.4 8 2 2.6 4.4 4 4.4 8" />
  </>
));

export const Timer = icon("Timer", () => (
  <>
    <Tone d="M12 6a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15z" />
    <circle cx="12" cy="13.5" r="7.5" />
    <path d="M9.6 3h4.8M12 3v3M12 13.5V9.8M18.2 7.3l1.3-1.3" />
  </>
));

export const Clock = icon("Clock", () => (
  <>
    <Tone d={DISC} />
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.2l3.2 2" />
  </>
));

export const AlarmClock = icon("AlarmClock", () => (
  <>
    <Tone d="M12 6a7.2 7.2 0 1 0 0 14.4A7.2 7.2 0 0 0 12 6z" />
    <circle cx="12" cy="13.2" r="7.2" />
    <path d="M12 9.6v3.8l2.4 1.5M4 6.6l3-2.6M20 6.6l-3-2.6" />
  </>
));

export const Globe2 = icon("Globe2", () => (
  <>
    <Tone d={DISC} />
    <circle cx="12" cy="12" r="9" />
    <path d="M3.3 12h17.4M12 3c-2.7 2.5-3.7 5.6-3.7 9s1 6.5 3.7 9c2.7-2.5 3.7-5.6 3.7-9S14.700 5.500 12 3z" />
  </>
));

// ── Calendar & tasks ──────────────────────────────────────────────────────
const CAL = "M4 8.5A3.5 3.5 0 0 1 7.5 5h9A3.5 3.5 0 0 1 20 8.5v9a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 4 17.5v-9z";

export const CalendarDays = icon("CalendarDays", () => (
  <>
    <Tone d={CAL} />
    <path d={CAL} />
    <path d="M4 10.5h16M8.5 3.5v3M15.5 3.5v3" />
    <Dot x={8.5} y={14.5} r={1} />
    <Dot x={12} y={14.5} r={1} />
    <Dot x={15.5} y={14.5} r={1} />
    <Dot x={8.5} y={17.6} r={1} />
    <Dot x={12} y={17.6} r={1} />
  </>
));

export const CalendarClock = icon("CalendarClock", () => (
  <>
    <Tone d={CAL} />
    <path d={CAL} />
    <path d="M4 10.5h16M8.5 3.5v3M15.5 3.5v3" />
    <circle cx="12" cy="15.6" r="2.9" />
    <path d="M12 14.3v1.5l1 .6" strokeWidth={1.5} />
  </>
));

export const CalendarRange = icon("CalendarRange", () => (
  <>
    <Tone d={CAL} />
    <path d={CAL} />
    <path d="M4 10.5h16M8.5 3.5v3M15.5 3.5v3" />
    <rect x="7" y="13.4" width="10" height="3.6" rx="1.8" fill="currentColor" fillOpacity={0.55} stroke="none" />
  </>
));

export const CheckSquare = icon("CheckSquare", () => (
  <>
    <rect x="4" y="4" width="16" height="16" rx="4.6" fill="currentColor" fillOpacity={0.34} stroke="none" />
    <rect x="4" y="4" width="16" height="16" rx="4.6" />
    <path d={CHECK} />
  </>
));

export const CheckCircle2 = icon("CheckCircle2", () => (
  <>
    <Tone d={DISC} />
    <circle cx="12" cy="12" r="9" />
    <path d={CHECK} />
  </>
));

export const ListChecks = icon("ListChecks", () => (
  <>
    <path d="M4.5 7.2l1.6 1.6L9 5.6M4.5 17.2l1.6 1.6L9 15.6" />
    <Dot x={6.8} y={12} r={1.3} />
    <path d="M12.5 7h7M12.5 12h7M12.5 17h7" />
  </>
));

export const Sun = icon("Sun", () => (
  <>
    <Tone d="M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z" opacity={0.5} />
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
  </>
));

export const Moon = icon("Moon", () => (
  <>
    <Tone d="M19.5 14.6A8 8 0 1 1 9.400 4.500a6.300 6.300 0 0 0 10.100 10.100z" />
    <path d="M19.5 14.6A8 8 0 1 1 9.400 4.500a6.300 6.300 0 0 0 10.100 10.100z" />
  </>
));

export const Sparkles = icon("Sparkles", () => (
  <>
    <Tone d="M10.500 4l1.800 5.200 5.200 1.800-5.200 1.800-1.800 5.200-1.800-5.200L3.500 11l5.200-1.800z" />
    <path d="M10.500 4l1.800 5.200 5.200 1.800-5.200 1.800-1.800 5.200-1.800-5.200L3.500 11l5.200-1.800zM18.500 3.500v3M17 5h3M18 16.500v3M16.500 18h3" />
  </>
));

/** Today's timeline: a rail with stops, the current one filled. */
export const Timeline = icon("Timeline", () => (
  <>
    <path d="M7 3.5v17" />
    <circle cx="7" cy="6.5" r="2" fill="currentColor" fillOpacity={0.36} />
    <circle cx="7" cy="12" r="2.4" fill="currentColor" />
    <circle cx="7" cy="17.5" r="2" fill="currentColor" fillOpacity={0.36} />
    <path d="M11.5 6.5h8M11.5 12h6M11.5 17.5h7.5" />
  </>
));

/** Streak: a flame drawn from two soft teardrops. */
export const Flame = icon("Flame", () => (
  <>
    <Tone d="M12 3.5c.6 3-2.4 4.3-2.4 7.2 0 1 .4 1.8 1 2.3-.3-2 1.4-3 2.2-4.6 2.3 2.2 4.2 4.4 4.2 7.1a5 5 0 0 1-10 0c0-4.6 4.3-6.6 5-12z" opacity={0.4} />
    <path d="M12 3.5c.6 3-2.4 4.3-2.4 7.2 0 1 .4 1.8 1 2.3-.3-2 1.4-3 2.2-4.6 2.3 2.2 4.2 4.4 4.2 7.1a5 5 0 0 1-10 0c0-4.6 4.3-6.6 5-12z" />
  </>
));
