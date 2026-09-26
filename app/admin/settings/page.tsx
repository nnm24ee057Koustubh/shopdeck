import { getSettings } from "@/lib/settings";
import { updateSettings, changePassword } from "@/lib/actions/settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: { saved?: string; pwerror?: string; email?: string };
}) {
  const settings = await getSettings();
  const saved = searchParams.saved === "1";
  const pwError = searchParams.pwerror;
  const emailLocked = (parseInt(settings.contactEmailChanges ?? "0", 10) || 0) >= 1;
  const emailChangeBlocked = searchParams.email === "locked";

  return (
    <div>
      <h1 className="page-title">Settings</h1>
      {emailChangeBlocked && (
        <div className="banner banner-error">
          The contact email cannot be changed again — it was already changed once and is now permanently locked.
        </div>
      )}
      {saved && <div className="banner banner-success">Saved successfully.</div>}
      {pwError === "1" && <div className="banner banner-error">Current password is incorrect.</div>}
      {pwError === "short" || pwError === "weak" ? (
        <div className="banner banner-error">
          New password must be at least 8 characters and include letters and numbers.
        </div>
      ) : null}

      <div className="cart-layout">
        <form action={updateSettings} className="card form-stack">
          <h2 className="section-title mt-0">Store & payments</h2>
          <div>
            <label htmlFor="storeName">Store name</label>
            <input id="storeName" name="storeName" type="text" defaultValue={settings.storeName} required />
          </div>
          <div className="form-grid">
            <div>
              <label htmlFor="contactEmail">Contact email</label>
              <input
                id="contactEmail"
                name="contactEmail"
                type="email"
                defaultValue={settings.contactEmail}
                disabled={emailLocked}
              />
              <p className="small muted mt-8">
                {emailLocked
                  ? "🔒 This email is permanently locked — it was already changed once."
                  : "⚠️ You can change this email exactly one time. After that it locks forever."}
              </p>
            </div>
            <div>
              <label htmlFor="contactPhone">Contact phone</label>
              <input id="contactPhone" name="contactPhone" type="tel" defaultValue={settings.contactPhone} />
            </div>
          </div>
          <div>
            <label htmlFor="businessAddress">Business address</label>
            <textarea id="businessAddress" name="businessAddress" defaultValue={settings.businessAddress} />
          </div>
          <div>
            <label htmlFor="announcementText">Announcement banner (shown to all customers)</label>
            <input
              id="announcementText"
              name="announcementText"
              type="text"
              maxLength={140}
              placeholder="e.g. Free delivery on orders above ₹499 — limited time!"
              defaultValue={settings.announcementText}
            />
            <p className="small muted mt-8">Leave empty to hide the banner.</p>
          </div>
          <div>
            <label htmlFor="upiVpa">UPI VPA (shown with COD orders)</label>
            <input id="upiVpa" name="upiVpa" type="text" placeholder="yourname@upi" defaultValue={settings.upiVpa} />
          </div>
          <div>
            <label htmlFor="razorpayMeUrl">Razorpay.me UPI payment link</label>
            <input
              id="razorpayMeUrl"
              name="razorpayMeUrl"
              type="url"
              placeholder="https://razorpay.me/@yourhandle"
              defaultValue={settings.razorpayMeUrl}
            />
          </div>
          <div>
            <label htmlFor="razorpayKeyId">Razorpay Key ID</label>
            <input
              id="razorpayKeyId"
              name="razorpayKeyId"
              type="text"
              placeholder="rzp_test_…"
              defaultValue={settings.razorpayKeyId}
            />
          </div>
          <div>
            <label htmlFor="razorpayKeySecret">Razorpay Key Secret</label>
            <input
              id="razorpayKeySecret"
              name="razorpayKeySecret"
              type="password"
              placeholder="Keep this secret"
              defaultValue={settings.razorpayKeySecret}
            />
            <p className="small muted mt-8">
              Leave both Razorpay fields empty to disable online payments — the checkout will offer
              Cash on Delivery only.
            </p>
          </div>
          <div>
            <button type="submit" className="btn btn-primary">
              Save settings
            </button>
          </div>
        </form>

        <div>
          <form action={changePassword} className="card form-stack">
            <h2 className="section-title mt-0">Change admin password</h2>
            <input type="hidden" name="redirectTo" value="/admin/settings" />
            <div>
              <label htmlFor="currentPassword">Current password</label>
              <input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" />
            </div>
            <div>
              <label htmlFor="newPassword">New password</label>
              <input id="newPassword" name="newPassword" type="password" required minLength={8} autoComplete="new-password" />
            </div>
            <div>
              <button type="submit" className="btn btn-primary">
                Update password
              </button>
            </div>
          </form>

          <div className="card mt-16">
            <h2 className="section-title mt-0">Default admin credentials</h2>
            <p className="small">{settings.adminPasswordNote}</p>
            <p className="small muted mt-8">
              The note text above is editable in the database (Setting key “adminPasswordNote”).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
