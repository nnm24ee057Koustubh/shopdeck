import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { updateProfile, changePassword } from "@/lib/actions/settings";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: { saved?: string; pwerror?: string };
}) {
  const user = await getSession();
  if (!user) redirect("/login?next=/account");

  const saved = searchParams.saved === "1";
  const pwError = searchParams.pwerror;

  return (
    <div>
      <h1 className="page-title">My account</h1>
      {saved && <div className="banner banner-success">Saved successfully.</div>}
      {pwError === "1" && (
        <div className="banner banner-error">Current password is incorrect.</div>
      )}
      {(pwError === "short" || pwError === "weak") && (
        <div className="banner banner-error">
          New password must be at least 8 characters and include letters and numbers.
        </div>
      )}

      <div className="cart-layout">
        <form action={updateProfile} className="card form-stack">
          <h2 className="section-title mt-0">Profile</h2>
          <input type="hidden" name="redirectTo" value="/account" />
          <div>
            <label htmlFor="name">Name</label>
            <input id="name" name="name" type="text" required defaultValue={user.name} />
          </div>
          <div>
            <label htmlFor="phone">Phone</label>
            <input id="phone" name="phone" type="tel" defaultValue={user.phone ?? ""} placeholder="10-digit mobile number" />
          </div>
          <div>
            <label htmlFor="emailDisplay">Email (cannot be changed)</label>
            <input id="emailDisplay" type="email" defaultValue={user.email} disabled />
          </div>
          <div>
            <button type="submit" className="btn btn-primary">
              Save profile
            </button>
          </div>
        </form>

        <form action={changePassword} className="card form-stack">
          <h2 className="section-title mt-0">Change password</h2>
          <input type="hidden" name="redirectTo" value="/account" />
          <div>
            <label htmlFor="currentPassword">Current password</label>
            <input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" />
          </div>
          <div>
            <label htmlFor="newPassword">New password</label>
            <input id="newPassword" name="newPassword" type="password" required minLength={8} autoComplete="new-password" />
            <p className="small muted mt-8">At least 8 characters.</p>
          </div>
          <div>
            <button type="submit" className="btn btn-primary">
              Update password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
