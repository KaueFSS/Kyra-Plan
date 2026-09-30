import type { MouseEvent, ReactNode } from "react";
import type { IconType } from "./icons";
import { ChevronRight } from "./icons";
import { classNames } from "../../utils/format";

interface WidgetCardProps {
  icon: IconType;
  title: string;
  subtitle?: ReactNode;
  /** Makes the title a link to the widget's full page. */
  onTitleClick?: () => void;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/** The single card shell every dashboard widget uses, so headers, spacing
 * and text alignment are identical across the whole HUD. */
export function WidgetCard({
  icon: Icon,
  title,
  subtitle,
  onTitleClick,
  actions,
  children,
  className,
  bodyClassName,
}: WidgetCardProps) {
  const titleContent = (
    <>
      <Icon size={22} className="ff-glyph shrink-0" />
      <span className="truncate">{title}</span>
      {onTitleClick && <ChevronRight size={14} className="shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" />}
    </>
  );

  return (
    <section className={classNames("ff-card flex h-full min-h-0 flex-col p-3.5", className)}>
      <header className="mb-2.5 shrink-0">
        {/* Title and actions share one fixed-height row so counters and
            buttons always line up with the title, whatever the subtitle. */}
        <div className="flex h-7 items-center justify-between gap-3">
          {onTitleClick ? (
            <button
              onClick={onTitleClick}
              className="group flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold text-text-primary transition-colors hover:text-accent-400"
            >
              {titleContent}
            </button>
          ) : (
            <h3 className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold text-text-primary">{titleContent}</h3>
          )}
          {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        </div>
        {subtitle && <div className="mt-0.5 truncate pl-[1.875rem] text-[0.75rem] text-text-muted">{subtitle}</div>}
      </header>
      <div className={classNames("flex min-h-0 flex-1 flex-col", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Small square icon button used for every header action (add, etc.). */
export function IconAction({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: IconType;
  label: string;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={classNames(
        "flex h-7 w-7 items-center justify-center rounded-lg border transition-colors",
        active
          ? "border-accent-500 bg-accent-500 text-white"
          : "border-border-subtle bg-surface-2 text-text-secondary hover:border-accent-500 hover:text-accent-400",
      )}
    >
      <Icon size={14} />
    </button>
  );
}
