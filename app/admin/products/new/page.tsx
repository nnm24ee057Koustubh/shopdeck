import Link from "next/link";
import { db } from "@/lib/db";
import ProductForm from "@/components/ProductForm";
import { createProduct } from "@/lib/actions/products";

export const dynamic = "force-dynamic";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const categories = await db.category.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <p className="small mb-16">
        <Link href="/admin/products" className="muted">
          ← Back to products
        </Link>
      </p>
      <h1 className="page-title">Add product</h1>
      {searchParams.error === "1" && (
        <div className="banner banner-error">
          Please fill in a name, a price greater than ₹0 and an image URL.
        </div>
      )}
      <ProductForm action={createProduct} categories={categories} />
    </div>
  );
}
