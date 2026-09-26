import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { createCoupon, toggleCoupon } from "@/lib/actions/coupons";
import { couponDescription } from "@/lib/coupons";
import { formatDay } from "@/lib/format";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  code: "Coupon code must be 3–20 letters/numbers.",
  type: "Invalid discount type.",
  value: "Enter a valid discount value.",
  percent: "Percentage discounts must be between 1 and 90.",
  duplicate: "A coupon with this code already exists.",
};

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  await requireAdmin();

  const [coupons, redeemed, spinStats] = await Promise.all([
    db.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    db.order.aggregate({ _sum: { discount: true }, where: { discount: { gt: 0 } } }),
    db.wheelSpin.aggregate({ _count: { _all: true } }),
  ]);
  const saved = searchParams.saved === "1";
  const error = searchParams.error ? ERRORS[searchParams.error] ?? "Something went wrong." : null;
  const totalDiscounted = redeemed._sum.discount ?? 0;
  const activeCount = coupons.filter((c) => c.active).length;
  const spinCount = spinStats._count._all;
  const spinCoupons = coupons.filter((c) => c.code.startsWith("SPIN-")).length;

  return (
    <div>
      <h1 className="page-title">Coupons</h1>
      {saved && <div className="banner banner-success">Coupon created.</div>}
      {error && <div className="banner banner-error">{error}</div>}
      <p className="muted">
        Total discount given to customers so far:{" "}
        <strong>₹{Math.round(totalDiscounted / 100)}</strong>
      </p>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-label">Coupons created</div>
          <div className="stat-value">{coupons.length}</div>
          <div className="small muted">{activeCount} active</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Spin-the-wheel spins</div>
          <div className="stat-value">{spinCount}</div>
          <div className="small muted">{spinCoupons} wheel coupons issued</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Discount given</div>
          <div className="stat-value is-money">₹{Math.round(totalDiscounted / 100)}</div>
          <div className="small muted">Across all orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Max allowed</div>
          <div className="stat-value">90%</div>
          <div className="small muted">or any flat ₹ amount</div>
        </div>
      </div>

      <div className="card coupon-guide">
        <h2 className="section-title mt-0">Owner's coupon rules</h2>
        <ul className="guide-list">
          <li>Percentage coupons: 1–90% off. Flat coupons: any ₹ amount off.</li>
          <li>Always set a <strong>minimum order</strong> so a discount never eats your profit on small carts.</li>
          <li>Set an <strong>expiry date</strong> — deadlines make people order instead of forgetting.</li>
          <li>Each customer gets <strong>one spin</strong> on the wheel; winning codes are personal (SPIN-…) and expire in 30 days.</li>
          <li>Turn a coupon off anytime — it stops working immediately, even for the wheel's codes.</li>
        </ul>
      </div>

      <div className="cart-layout">
        <form action={createCoupon} className="card form-stack">
          <input type="hidden" name="redirectTo" value="/admin/coupons" />
          <h2 className="section-title mt-0">Create coupon</h2>
          <div>
            <label htmlFor="code">Code (e.g. UNIC10)</label>
            <input id="code" name="code" type="text" required placeholder="UNIC10" maxLength={20} />
          </div>
          <div className="form-grid">
            <div>
              <label htmlFor="type">Type</label>
              <select id="type" name="type" defaultValue="PERCENT">
                <option value="PERCENT">Percent off</option>
                <option value="FLAT">Flat ₹ off</option>
              </select>
            </div>
            <div>
              <label htmlFor="value">Value</label>
              <input id="value" name="value" type="number" step="0.01" min="1" required placeholder="10" />
            </div>
          </div>
          <div className="form-grid">
            <div>
              <label htmlFor="minOrder">Minimum order (₹)</label>
              <input id="minOrder" name="minOrder" type="number" step="0.01" min="0" defaultValue="0" />
            </div>
            <div>
              <label htmlFor="expiresAt">Expires on (optional)</label>
              <input id="expiresAt" name="expiresAt" type="date" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            Create coupon
          </button>
        </form>

        <div className="card">
          <h2 className="section-title mt-0">All coupons</h2>
          {coupons.length === 0 ? (
            <p className="muted">No coupons yet. Create your first one to run an offer.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Min order</th>
                  <th>Used</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => {
                  const expired = c.expiresAt && c.expiresAt.getTime() < Date.now();
                  return (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.code}</strong>
                      </td>
                      <td>{couponDescription(c.type, c.value, 0).split(" (")[0]}</td>
                      <td>{c.minOrder > 0 ? `₹${c.minOrder / 100}` : "—"}</td>
                      <td>{c.usedCount}</td>
                      <td>{c.expiresAt ? formatDay(c.expiresAt) : "—"}</td>
                      <td>
                        {expired ? (
                          <span className="stock-out">Expired</span>
                        ) : c.active ? (
                          <span className="stock-ok">Active</span>
                        ) : (
                          <span className="stock-low">Off</span>
                        )}
                      </td>
                      <td>
                        <form action={toggleCoupon}>
                          <input type="hidden" name="id" value={c.id} />
                          <button type="submit" className="btn btn-outline btn-sm">
                            {c.active ? "Turn off" : "Turn on"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
