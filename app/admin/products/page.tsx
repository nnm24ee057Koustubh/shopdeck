import Link from "next/link";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { toggleActive, deleteProduct } from "@/lib/actions/products";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await db.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { category: true },
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h1 className="page-title">Products</h1>
        <Link href="/admin/products/new" className="btn btn-primary">
          + Add Product
        </Link>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th className="table-right">Price</th>
              <th className="table-right">Cost</th>
              <th className="table-right">Stock</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted">
                  No products yet — add your first one.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.imageUrl} alt="" className="thumb" />
                      <div>
                        <Link href={`/products/${p.id}`} className="font-bold">
                          {p.name}
                        </Link>
                        {p.stock < 5 && <div className="small stock-low">Low stock</div>}
                      </div>
                    </div>
                  </td>
                  <td>{p.category?.name ?? "—"}</td>
                  <td className="table-right">{formatINR(p.price)}</td>
                  <td className="table-right muted">{formatINR(p.costPrice)}</td>
                  <td className="table-right">{p.stock}</td>
                  <td>
                    <form action={toggleActive}>
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        type="submit"
                        className={`badge ${p.active ? "badge-delivered" : "badge-cancelled"}`}
                        style={{ border: "none", cursor: "pointer" }}
                        title={p.active ? "Visible in shop — click to hide" : "Hidden — click to show"}
                      >
                        {p.active ? "Active" : "Hidden"}
                      </button>
                    </form>
                  </td>
                  <td>
                    <div className="row-actions">
                      <Link href={`/admin/products/${p.id}`} className="btn btn-sm btn-outline">
                        Edit
                      </Link>
                      <form action={deleteProduct}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="btn btn-sm btn-danger-outline">
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
