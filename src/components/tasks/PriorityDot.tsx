import type { Priority } from "../../types/task";
import { classNames } from "../../utils/format";

const LABELS: Record<Priority, string> = { low: "baixa", medium: "média", high: "alta" };

const COLORS: Record<Priority, string> = {
  low: "bg-info",
  medium: "bg-warning",
  high: "bg-danger",
};

export function PriorityDot({ priority }: { priority: Priority }) {
  return <span className={classNames("h-2 w-2 rounded-full shrink-0", COLORS[priority])} title={`Prioridade ${LABELS[priority]}`} />;
}
