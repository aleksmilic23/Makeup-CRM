"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import type { Product, ProductInsert } from "@/lib/database.types";

const CATEGORIES = ["Foundation", "Eyes", "Lips", "Brushes", "Skincare", "Setting", "Other"];

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ProductInsert>({
    name: product?.name ?? "",
    brand: product?.brand ?? "",
    category: product?.category ?? "Foundation",
    stock: product?.stock ?? 0,
    low_stock_threshold: product?.low_stock_threshold ?? 5,
    cost: product?.cost ?? null,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);

    if (product) {
      const { error } = await supabase.from("products").update(form).eq("id", product.id);
      if (error) toast.error("Failed to update");
      else { toast.success("Product updated"); router.refresh(); router.push("/products"); }
    } else {
      const { error } = await supabase.from("products").insert(form);
      if (error) toast.error("Failed to create");
      else { toast.success("Product added"); router.push("/products"); }
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!product) return;
    if (!confirm("Delete this product?")) return;
    setLoading(true);
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) { toast.error("Failed to delete"); setLoading(false); }
    else { toast.success("Product deleted"); router.push("/products"); }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{product ? "Edit Product" : "Add Product"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
                placeholder="e.g. Matte Foundation"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={form.brand ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value || null }))}
                placeholder="e.g. MAC"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cost">Cost ($)</Label>
              <Input
                id="cost"
                type="number"
                min={0}
                step={0.01}
                value={form.cost ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, cost: e.target.value ? Number(e.target.value) : null }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock">Current Stock</Label>
              <Input
                id="stock"
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => setForm((p) => ({ ...p, stock: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="threshold">Low Stock Alert At</Label>
              <Input
                id="threshold"
                type="number"
                min={0}
                value={form.low_stock_threshold}
                onChange={(e) => setForm((p) => ({ ...p, low_stock_threshold: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={loading} size="sm">
              {loading ? "Saving..." : product ? "Save Changes" : "Add Product"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => router.back()}>
              Cancel
            </Button>
            {product && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="ml-auto"
                onClick={handleDelete}
                disabled={loading}
              >
                Delete
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
