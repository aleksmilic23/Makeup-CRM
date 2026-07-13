import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Package, AlertTriangle } from "lucide-react";
import type { Product } from "@/lib/database.types";

export const dynamic = "force-dynamic";

async function getProducts(): Promise<Product[]> {
  const { data } = await supabase.from("products").select("*").order("name");
  return data ?? [];
}

const CATEGORY_COLORS: Record<string, string> = {
  Foundation: "bg-amber-100 text-amber-700",
  Eyes: "bg-purple-100 text-purple-700",
  Lips: "bg-rose-100 text-rose-700",
  Brushes: "bg-blue-100 text-blue-700",
  Skincare: "bg-green-100 text-green-700",
  Setting: "bg-gray-100 text-gray-700",
};

export default async function ProductsPage() {
  const products = await getProducts();
  const lowStock = products.filter((p) => p.stock <= p.low_stock_threshold);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">{products.length} items</p>
        </div>
        <Link href="/products/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Product
          </Button>
        </Link>
      </div>

      {lowStock.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Low stock alert</p>
            <p className="text-xs text-amber-700">{lowStock.map((p) => p.name).join(", ")}</p>
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No products yet</p>
            <p className="text-sm text-muted-foreground mb-4">Track your makeup inventory.</p>
            <Link href="/products/new">
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Product</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Product</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Stock</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Cost</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((product) => {
                const isLow = product.stock <= product.low_stock_threshold;
                const catColor = CATEGORY_COLORS[product.category] ?? "bg-gray-100 text-gray-700";
                return (
                  <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{product.name}</p>
                      {product.brand && (
                        <p className="text-xs text-muted-foreground">{product.brand}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catColor}`}>
                        {product.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={isLow ? "text-red-600 font-semibold" : ""}>
                        {product.stock}
                      </span>
                      {isLow && <AlertTriangle className="h-3 w-3 text-red-500 inline ml-1" />}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {product.cost != null ? `$${Number(product.cost).toFixed(0)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/products/${product.id}/edit`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">Edit</Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
