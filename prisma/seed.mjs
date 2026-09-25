// Seed script for ShopDeck. Run with: node prisma/seed.mjs
// (after `npx prisma db push`).
// Uses a plain-JS inline scrypt hash identical to lib/password.ts:
// format: scrypt$16384$8$1$<saltHex>$<keyHex>  (keylen 64)

import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("hex")}$${key.toString("hex")}`;
}

const categories = [
  { name: "Electronics", slug: "electronics" },
  { name: "Fashion", slug: "fashion" },
  { name: "Home & Kitchen", slug: "home-kitchen" },
  { name: "Beauty", slug: "beauty" },
  { name: "Sports", slug: "sports" },
];

const products = [
  {
    name: "Wireless Over-Ear Headphones",
    description:
      "Deep, punchy bass and 40-hour battery life. Lightweight foldable design with plush memory-foam earcups, Bluetooth 5.3 and a built-in mic for calls.",
    price: 299900,
    costPrice: 209900,
    stock: 34,
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop",
    categorySlug: "electronics",
  },
  {
    name: "Smart Fitness Watch",
    description:
      "Track heart rate, SpO2, sleep and 100+ workout modes on a bright AMOLED display. 10-day battery, 5ATM water resistance and interchangeable straps.",
    price: 449900,
    costPrice: 314900,
    stock: 22,
    imageUrl: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=600&auto=format&fit=crop",
    categorySlug: "electronics",
  },
  {
    name: "True Wireless Earbuds",
    description:
      "Feather-light earbuds with active noise cancellation, touch controls, low-latency gaming mode and 24 hours of total playtime with the charging case.",
    price: 179900,
    costPrice: 125900,
    stock: 48,
    imageUrl: "https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=600&auto=format&fit=crop",
    categorySlug: "electronics",
  },
  {
    name: "Classic Leather Sneakers",
    description:
      "Timeless low-top sneakers in premium full-grain leather with a cushioned insole and durable rubber outsole. Pairs with everything, built to last.",
    price: 349900,
    costPrice: 244900,
    stock: 26,
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop",
    categorySlug: "fashion",
  },
  {
    name: "Everyday Running Shoes",
    description:
      "Breathable mesh uppers with responsive foam midsoles for daily miles. Secure lace-up fit, reflective accents for night runs and a grippy outsole.",
    price: 219900,
    costPrice: 153900,
    stock: 40,
    imageUrl: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=600&auto=format&fit=crop",
    categorySlug: "fashion",
  },
  {
    name: "UV-Protection Sunglasses",
    description:
      "Polarised lenses with 100% UV400 protection in a lightweight acetate frame. Includes a hard case and microfibre cleaning pouch.",
    price: 129900,
    costPrice: 90900,
    stock: 35,
    imageUrl: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=600&auto=format&fit=crop",
    categorySlug: "fashion",
  },
  {
    name: "Accent Lounge Chair",
    description:
      "A mid-century inspired armchair with a solid wood frame, boucle upholstery and high-density foam cushioning. Perfect reading corner upgrade.",
    price: 799900,
    costPrice: 559900,
    stock: 8,
    imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=600&auto=format&fit=crop",
    categorySlug: "home-kitchen",
  },
  {
    name: "Ceramic Table Lamp",
    description:
      "Hand-glazed ceramic base with a linen drum shade. Warm, diffused light with an inline dimmer switch and a fabric braided cord.",
    price: 149900,
    costPrice: 104900,
    stock: 30,
    imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=600&auto=format&fit=crop",
    categorySlug: "home-kitchen",
  },
  {
    name: "Vitamin C Face Serum",
    description:
      "15% stabilised vitamin C with hyaluronic acid and vitamin E. Brightens and evens skin tone; fragrance-free, dermatologically tested, 30ml.",
    price: 64900,
    costPrice: 45500,
    stock: 60,
    imageUrl: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?q=80&w=600&auto=format&fit=crop",
    categorySlug: "beauty",
  },
  {
    name: "Luxury Eau de Parfum",
    description:
      "A warm, long-lasting fragrance with top notes of bergamot, a jasmine-rose heart and a cedar-amber base. 50ml spray bottle.",
    price: 189900,
    costPrice: 132900,
    stock: 25,
    imageUrl: "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=600&auto=format&fit=crop",
    categorySlug: "beauty",
  },
  {
    name: "Adjustable Dumbbell Set",
    description:
      "Space-saving adjustable dumbbells, 2.5 kg to 20 kg per hand with a quick dial. Knurled steel handle and a compact storage tray.",
    price: 219900,
    costPrice: 153900,
    stock: 15,
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=600&auto=format&fit=crop",
    categorySlug: "sports",
  },
  {
    name: "Performance Cycling Jersey",
    description:
      "Moisture-wicking, aerodynamic cycling jersey with a full-length zip, three rear pockets and 50+ UV protection. Unisex fit.",
    price: 189900,
    costPrice: 132900,
    stock: 28,
    imageUrl: "https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=600&auto=format&fit=crop",
    categorySlug: "sports",
  },
];

const settings = [
  { key: "storeName", value: "ShopDeck" },
  { key: "contactEmail", value: "support@shopdeck.local" },
  { key: "contactPhone", value: "+91 90000 00000" },
  { key: "razorpayMeUrl", value: "https://razorpay.me/@koustubhdeshpande" },
  {
    key: "businessAddress",
    value: "ShopDeck Retail, 4th Floor, Prestige Tech Park, Bengaluru, Karnataka 560103",
  },
  {
    key: "adminPasswordNote",
    value:
      "Default admin credentials: admin@shopdeck.local / Admin@123 — change this password immediately from Admin > Settings.",
  },
];

async function main() {
  console.log("Seeding ShopDeck database...");

  // Wipe existing catalog data (safe for a fresh dev database).
  await prisma.orderItem.deleteMany();
  await prisma.orderEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.setting.deleteMany();

  // Admin user.
  await prisma.user.create({
    data: {
      email: "admin@shopdeck.local",
      passwordHash: hashPassword("Admin@123"),
      name: "Store Owner",
      phone: "+91 90000 00000",
      role: "ADMIN",
    },
  });
  console.log("Created admin user admin@shopdeck.local (password: Admin@123)");

  // Categories.
  const slugToId = {};
  for (const c of categories) {
    const created = await prisma.category.create({ data: c });
    slugToId[c.slug] = created.id;
  }
  console.log(`Created ${categories.length} categories`);

  // Products.
  for (const p of products) {
    const { categorySlug, ...rest } = p;
    await prisma.product.create({
      data: { ...rest, categoryId: slugToId[categorySlug] ?? null },
    });
  }
  console.log(`Created ${products.length} products`);

  // Settings defaults.
  for (const s of settings) {
    await prisma.setting.create({ data: s });
  }
  console.log("Created default settings");

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
