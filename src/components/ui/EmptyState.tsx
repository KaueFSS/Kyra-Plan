import type { IconType } from "./icons";
import { classNames } from "../../utils/format";

interface EmptyStateProps {
  icon: IconType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Tighter padding/icon size for use inside a compact dashboard card,
   * where the generous default spacing makes an empty widget look taller
   * than its filled siblings. */
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <div className={classNames("flex flex-col items-center justify-center text-center", compact ? "py-6 px-4" : "py-14 px-6")}>
      <div
        className={classNames(
          "flex items-center justify-center rounded-full bg-surface-2 text-text-muted",
          compact ? "mb-2 h-9 w-9" : "mb-3 h-12 w-12",
        )}
      >
        <Icon size={compact ? 16 : 22} />
      </div>
      <p className={classNames("font-medium text-text-primary", compact ? "text-xs" : "text-sm")}>{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
