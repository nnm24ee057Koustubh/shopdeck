import Link from "next/link";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/money", label: "Money" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminNav() {
  return (
    <nav className="admin-nav">
      <span className="admin-nav-label">Admin</span>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
