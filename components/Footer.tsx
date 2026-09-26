import Link from "next/link";
import { getSettings } from "@/lib/settings";

export default async function Footer() {
  const settings = await getSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-col footer-brand">
          <div className="footer-logo">{settings.storeName}</div>
          <p>{settings.businessAddress}</p>
          <div className="footer-pay">
            <span>💳 UPI / Cards</span>
            <span>💵 Cash on Delivery</span>
            <span>🔒 Secure checkout</span>
          </div>
        </div>
        <div className="footer-col">
          <h4>Shop</h4>
          <Link href="/products">All products</Link>
          <Link href="/wheel">Spin & Win a coupon</Link>
          <Link href="/cart">Your cart</Link>
          <Link href="/wishlist">Your wishlist</Link>
        </div>
        <div className="footer-col">
          <h4>Account</h4>
          <Link href="/login">Login</Link>
          <Link href="/register">Create account</Link>
          <Link href="/orders">Track your orders</Link>
          <Link href="/account">Account settings</Link>
        </div>
        <div className="footer-col">
          <h4>Get in touch</h4>
          <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>
          {settings.contactPhone && <a href={`tel:${settings.contactPhone}`}>{settings.contactPhone}</a>}
          <Link href="/verify">Verify your email</Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {year} {settings.storeName}. All prices in Indian Rupees.</span>
        <span>Delivering across India 🇮🇳</span>
      </div>
    </footer>
  );
}
