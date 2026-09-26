// Spin-the-wheel prize table. Weights are percentages (sum = 100).
// The table is deliberately owner-friendly: big prizes are rare and always
// carry a minimum order, so every spin that converts still earns margin.
export type WheelPrize = {
  label: string;
  weight: number;
  couponType: "PERCENT" | "FLAT" | null;
  value: number; // percent for PERCENT, paise for FLAT
  minOrder: number; // paise
  color: string;
  text: string;
};

export const WHEEL_PRIZES: WheelPrize[] = [
  { label: "5% OFF", weight: 2, couponType: "PERCENT", value: 5, minOrder: 0, color: "#4f46e5", text: "#fff" },
  { label: "₹30 OFF", weight: 20, couponType: "FLAT", value: 3000, minOrder: 49900, color: "#0ea5e9", text: "#fff" },
  { label: "10% OFF", weight: 18, couponType: "PERCENT", value: 10, minOrder: 99900, color: "#f59e0b", text: "#1f2937" },
  { label: "Better luck next time", weight: 28, couponType: null, value: 0, minOrder: 0, color: "#64748b", text: "#fff" },
  { label: "8% OFF", weight: 8, couponType: "PERCENT", value: 8, minOrder: 59900, color: "#10b981", text: "#1f2937" },
  { label: "₹100 OFF", weight: 6, couponType: "FLAT", value: 10000, minOrder: 149900, color: "#ec4899", text: "#fff" },
  { label: "Try again soon", weight: 17, couponType: null, value: 0, minOrder: 0, color: "#334155", text: "#fff" },
  { label: "15% OFF JACKPOT", weight: 1, couponType: "PERCENT", value: 15, minOrder: 299900, color: "#7c3aed", text: "#fff" },
];

export function pickPrize(): WheelPrize {
  const total = WHEEL_PRIZES.reduce((s, p) => s + p.weight, 0);
  let roll = Math.random() * total;
  for (const prize of WHEEL_PRIZES) {
    roll -= prize.weight;
    if (roll < 0) return prize;
  }
  return WHEEL_PRIZES[0];
}

export function spinCouponDescription(prize: WheelPrize): string {
  if (prize.couponType === "PERCENT") {
    return `${prize.value}% off${prize.minOrder > 0 ? ` on orders above ₹${prize.minOrder / 100}` : ""}`;
  }
  return `₹${prize.value / 100} off on orders above ₹${prize.minOrder / 100}`;
}
