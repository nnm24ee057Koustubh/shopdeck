import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ProductForm from "@/components/ProductForm";
import { updateProduct } from "@/lib/actions/products";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [product, categories] = await Promise.all([
    db.product.findUnique({ where: { id } }),
    db.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();

  return (
    <div>
      <p className="small mb-16">
        <Link href="/admin/products" className="muted">
          ← Back to products
        </Link>
      </p>
      <h1 className="page-title">Edit product</h1>
      {searchParams.error === "1" && (
        <div className="banner banner-error">
          Please fill in a name, a price greater than ₹0 and an image URL.
        </div>
      )}
      <ProductForm
        action={updateProduct}
        categories={categories}
        values={{
          id: product.id,
          name: product.name,
          description: product.description,
          priceRupees: String(product.price / 100),
          costPriceRupees: String(product.costPrice / 100),
          stock: String(product.stock),
          imageUrl: product.imageUrl,
          categoryId: product.categoryId ? String(product.categoryId) : "",
          active: product.active,
        }}
      />
    </div>
  );
}
