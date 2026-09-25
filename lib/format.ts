// Pure helpers — safe to import from both server and client components.

export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: rupees % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

export const ORDER_STATUSES = [
  "PLACED",
  "APPROVED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "REJECTED",
] as const;

export const statusLabels: Record<string, string> = {
  PLACED: "Placed",
  APPROVED: "Approved",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
};

export const paymentStatusLabels: Record<string, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  COD_PENDING: "COD pending",
  REFUNDED: "Refunded",
  FAILED: "Failed",
};

export function statusLabel(status: string): string {
  return statusLabels[status] ?? paymentStatusLabels[status] ?? status;
}

// Order status machine: which statuses may follow a given status.
const FLOW: Record<string, string[]> = {
  PLACED: ["APPROVED", "CANCELLED", "REJECTED"],
  APPROVED: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
  REJECTED: [],
};

export function allowedNextStatuses(status: string): string[] {
  return FLOW[status] ?? [];
}

export function statusTransitionAllowed(from: string, to: string): boolean {
  return allowedNextStatuses(from).includes(to);
}

export function statusBadgeClass(status: string): string {
  return `badge badge-${String(status).toLowerCase().replace(/_/g, "-")}`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDay(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
