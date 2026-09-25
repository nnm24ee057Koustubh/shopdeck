"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

function rupeesToPaise(value: FormDataEntryValue | null): number {
  const n = parseFloat(String(value ?? "0"));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function intOr(value: FormDataEntryValue | null, fallback: number): number {
  const n = parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function revalidateCatalog() {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/products");
  revalidatePath("/admin");
}

export async function createProduct(formData: FormData): Promise<void> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const price = rupeesToPaise(formData.get("price"));
  const costPrice = rupeesToPaise(formData.get("costPrice"));
  const stock = intOr(formData.get("stock"), 0);
  const categoryId = intOr(formData.get("categoryId"), 0);
  const active = formData.get("active") === "on";

  if (!name || price <= 0 || !imageUrl) {
    redirect("/admin/products/new?error=1");
  }

  await db.product.create({
    data: {
      name,
      description,
      price,
      costPrice,
      stock,
      imageUrl,
      categoryId: categoryId > 0 ? categoryId : null,
      active,
    },
  });

  revalidateCatalog();
  redirect("/admin/products");
}

export async function updateProduct(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = intOr(formData.get("id"), 0);
  if (id <= 0) redirect("/admin/products");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const price = rupeesToPaise(formData.get("price"));
  const costPrice = rupeesToPaise(formData.get("costPrice"));
  const stock = intOr(formData.get("stock"), 0);
  const categoryId = intOr(formData.get("categoryId"), 0);
  const active = formData.get("active") === "on";

  const existing = await db.product.findUnique({ where: { id } });
  if (!existing) redirect("/admin/products");

  if (!name || price <= 0 || !imageUrl) {
    redirect(`/admin/products/${id}?error=1`);
  }

  await db.product.update({
    where: { id },
    data: {
      name,
      description,
      price,
      costPrice,
      stock,
      imageUrl,
      categoryId: categoryId > 0 ? categoryId : null,
      active,
    },
  });

  revalidateCatalog();
  redirect("/admin/products");
}

export async function deleteProduct(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = intOr(formData.get("id"), 0);
  if (id > 0) {
    const existing = await db.product.findUnique({ where: { id }, include: { _count: { select: { orderItems: true } } } });
    if (existing) {
      // OrderItem.productId is nullable: detach order history so snapshots survive.
      if (existing._count.orderItems > 0) {
        await db.product.update({ where: { id }, data: { orderItems: { set: [] } } });
      }
      await db.product.delete({ where: { id } });
    }
  }

  revalidateCatalog();
  redirect("/admin/products");
}

export async function toggleActive(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = intOr(formData.get("id"), 0);
  const existing = id > 0 ? await db.product.findUnique({ where: { id } }) : null;
  if (existing) {
    await db.product.update({ where: { id }, data: { active: !existing.active } });
  }

  revalidateCatalog();
  revalidatePath(`/products/${id}`);
  redirect("/admin/products");
}
