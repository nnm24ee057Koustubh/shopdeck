import { statusBadgeClass, statusLabel } from "@/lib/format";

export default function StatusBadge({
  status,
  kind = "order",
}: {
  status: string;
  kind?: "order" | "payment";
}) {
  return (
    <span className={statusBadgeClass(status)} title={kind === "payment" ? `Payment: ${status}` : `Status: ${status}`}>
      {statusLabel(status)}
    </span>
  );
}
