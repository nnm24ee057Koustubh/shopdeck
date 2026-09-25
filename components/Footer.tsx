import { getSettings } from "@/lib/settings";

export default async function Footer() {
  const settings = await getSettings();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="font-bold" style={{ marginBottom: 4 }}>
          {settings.storeName}
        </div>
        <div>
          Questions? Email us at{" "}
          <a href={`mailto:${settings.contactEmail}`} style={{ color: "var(--accent)" }}>
            {settings.contactEmail}
          </a>
          {settings.contactPhone ? ` · ${settings.contactPhone}` : ""}
        </div>
        <div className="small" style={{ marginTop: 6 }}>
          {settings.businessAddress}
        </div>
        <div className="small" style={{ marginTop: 6 }}>
          © {new Date().getFullYear()} {settings.storeName}. All prices in Indian Rupees.
        </div>
      </div>
    </footer>
  );
}
