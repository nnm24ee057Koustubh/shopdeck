import Link from "next/link";
import { getSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import LogoutButton from "./LogoutButton";
import CartCount from "./CartCount";
import WishlistCount from "./WishlistCount";
import ThemeToggle from "./ThemeToggle";

export default async function Header() {
  const [user, settings] = await Promise.all([getSession(), getSettings()]);
  return (
    <>
      {settings.announcementText && settings.announcementText.trim() !== "" && (
        <div className="announcement-bar">{settings.announcementText}</div>
      )}
      <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand">
          {settings.storeName}
        </Link>
        <nav className="main-nav">
          <Link href="/" className="nav-link">
            Shop
          </Link>
          <Link href="/wheel" className="nav-link">
            🎡 Spin & Win
          </Link>
          <Link href="/orders" className="nav-link">
            My Orders
          </Link>
          <CartCount />
          <WishlistCount />
          <ThemeToggle />
          {user ? (
            <>
              {user.role === "ADMIN" && (
                <Link href="/admin" className="nav-link">
                  Admin
                </Link>
              )}
              <Link href="/account" className="nav-link">
                Account
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="nav-link">
                Login
              </Link>
              <Link href="/register" className="btn btn-primary btn-sm">
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
    </>
  );
}
