import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ShopDeck — Online store",
  description:
    "ShopDeck is a modern online marketplace for electronics, fashion, home, beauty and sports. Cash on Delivery and secure online payments.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <Header />
          <main className="container main-content">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
