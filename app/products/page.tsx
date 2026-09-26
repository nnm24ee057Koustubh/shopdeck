import Link from "next/link";
import { db } from "@/lib/db";
import ProductCard from "@/components/ProductCard";
import { withRatings } from "@/lib/ratings";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string; cat?: string; sort?: string; max?: string };

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const q = (searchParams.q ?? "").trim();
  const cat = (searchParams.cat ?? "").trim();
  const sort = searchParams.sort ?? "newest";
  const max = parseInt(searchParams.max ?? "", 10);
  const maxValid = Number.isFinite(max) && max > 0;

  const where: Record<string, unknown> = { active: true };
  if (q) where.name = { contains: q };
  if (cat) where.category = { slug: cat };
  if (maxValid) where.price = { lte: max * 100 };

  const orderBy =
    sort === "price_asc"
      ? { price: "asc" as const }
      : sort === "price_desc"
        ? { price: "desc" as const }
        : { createdAt: "desc" as const };

  const [categories, products] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" } }),
    db.product.findMany({
      where,
      orderBy,
      include: { category: true, reviews: { select: { rating: true } } },
    }),
  ]);
  let ratedProducts = withRatings(products);
  if (sort === "rating") {
    ratedProducts = [...ratedProducts].sort(
      (a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0)
    );
  }

  const activeCat = categories.find((c) => c.slug === cat);

  const pageUrl = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (cat) sp.set("cat", cat);
    if (maxValid) sp.set("max", String(max));
    for (const [k, v] of Object.entries(params)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    const s = sp.toString();
    return s ? `/products?${s}` : "/products";
  };

  return (
    <div>
      <h1 className="page-title">{activeCat ? activeCat.name : "All products"}</h1>
      <p className="page-subtitle">
        {products.length} product{products.length === 1 ? "" : "s"}
        {q ? ` matching “${q}”` : ""}
      </p>

      <div className="chips">
        <Link href={pageUrl({ cat: undefined })} className={`chip ${cat ? "" : "chip-active"}`}>
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={pageUrl({ cat: c.slug === cat ? undefined : c.slug })}
            className={`chip ${c.slug === cat ? "chip-active" : ""}`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      <div className="sort-links">
        <span className="muted small">Sort:</span>
        <Link href={pageUrl({ sort: undefined })} className={sort === "newest" ? "font-bold" : ""}>
          Newest
        </Link>
        <Link href={pageUrl({ sort: "price_asc" })} className={sort === "price_asc" ? "font-bold" : ""}>
          Price: low to high
        </Link>
        <Link href={pageUrl({ sort: "price_desc" })} className={sort === "price_desc" ? "font-bold" : ""}>
          Price: high to low
        </Link>
        <Link href={pageUrl({ sort: "rating" })} className={sort === "rating" ? "font-bold" : ""}>
          Top rated
        </Link>
      </div>

      <form className="toolbar" action="/products" method="get">
        {cat && <input type="hidden" name="cat" value={cat} />}
        <input type="search" name="q" defaultValue={q} placeholder="Search products…" aria-label="Search products" />
        <input type="number" name="max" min="1" step="1" defaultValue={maxValid ? max : ""} placeholder="Max price ₹" aria-label="Maximum price in rupees" style={{ maxWidth: 150 }} />
        <button type="submit" className="btn btn-primary">Apply</button>
        {(maxValid || q) && (
          <Link href={pageUrl({ max: undefined, q: undefined })} className="btn btn-outline">Clear</Link>
        )}
      </form>

      {products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">Nothing found</div>
          <p>Try a different search or category.</p>
        </div>
      ) : (
        <div className="product-grid">
          {ratedProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
