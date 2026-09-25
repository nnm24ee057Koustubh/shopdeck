type CategoryOption = { id: number; name: string };

export type ProductFormValues = {
  id?: number;
  name: string;
  description: string;
  priceRupees: string;
  costPriceRupees: string;
  stock: string;
  imageUrl: string;
  categoryId: string;
  active: boolean;
};

// Plain form that submits to a server action. Prices are entered in rupees
// and converted to paise server-side by the action.
export default function ProductForm({
  action,
  categories,
  values,
}: {
  action: (formData: FormData) => Promise<void>;
  categories: CategoryOption[];
  values?: ProductFormValues;
}) {
  const v: ProductFormValues =
    values ?? {
      name: "",
      description: "",
      priceRupees: "",
      costPriceRupees: "",
      stock: "10",
      imageUrl: "",
      categoryId: "",
      active: true,
    };

  return (
    <form action={action} className="form-stack card">
      {v.id !== undefined && <input type="hidden" name="id" value={v.id} />}

      <div>
        <label htmlFor="name">Product name</label>
        <input id="name" name="name" type="text" required defaultValue={v.name} placeholder="e.g. Wireless Headphones" />
      </div>

      <div>
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" defaultValue={v.description} placeholder="What makes this product great?" />
      </div>

      <div className="form-grid">
        <div>
          <label htmlFor="price">Selling price (₹)</label>
          <input id="price" name="price" type="number" min="1" step="0.01" required defaultValue={v.priceRupees} placeholder="2999" />
        </div>
        <div>
          <label htmlFor="costPrice">Cost price (₹)</label>
          <input id="costPrice" name="costPrice" type="number" min="0" step="0.01" defaultValue={v.costPriceRupees} placeholder="2099" />
        </div>
      </div>

      <div className="form-grid">
        <div>
          <label htmlFor="stock">Stock</label>
          <input id="stock" name="stock" type="number" min="0" step="1" defaultValue={v.stock} />
        </div>
        <div>
          <label htmlFor="categoryId">Category</label>
          <select id="categoryId" name="categoryId" defaultValue={v.categoryId}>
            <option value="">— No category —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="imageUrl">Image URL</label>
        <input id="imageUrl" name="imageUrl" type="url" required defaultValue={v.imageUrl} placeholder="https://images.unsplash.com/photo-..." />
      </div>

      <div className="checkbox-row">
        <input id="active" name="active" type="checkbox" defaultChecked={v.active} />
        <label htmlFor="active">Active (visible in the shop)</label>
      </div>

      <div>
        <button type="submit" className="btn btn-primary">
          {v.id !== undefined ? "Save changes" : "Create product"}
        </button>
      </div>
    </form>
  );
}
