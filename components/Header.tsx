import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import LogoutButton from "./LogoutButton";
import CartCount from "./CartCount";
import WishlistCount from "./WishlistCount";
import ThemeToggle from "./ThemeToggle";
import SearchBar from "./SearchBar";

export default async function Header() {
  const [user, settings, categories] = await Promise.all([
    getSession(),
    getSettings(),
    db.category.findMany({ orderBy: { name: "asc" }, take: 8 }),
  ]);
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
          <SearchBar />
          <div className="header-actions">
            <ThemeToggle />
            <CartCount />
            <WishlistCount />
            {user ? (
              <>
                {user.role === "ADMIN" && (
                  <Link href="/admin" className="nav-link">
                    Admin
                  </Link>
                )}
                <Link href="/orders" className="nav-link hide-sm">
                  My Orders
                </Link>
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
          </div>
        </div>
        <nav className="cat-strip">
          <div className="container cat-strip-inner">
            <Link href="/products" className="cat-strip-link">
              All Products
            </Link>
            {categories.map((c) => (
              <Link key={c.id} href={`/products?cat=${c.slug}`} className="cat-strip-link">
                {c.name}
              </Link>
            ))}
            <Link href="/wheel" className="cat-strip-link cat-strip-deal">
              🎡 Spin & Win
            </Link>
          </div>
        </nav>
      </header>
    </>
  );
}
