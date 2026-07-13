import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/product-form";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: product } = await supabase.from("products").select("*").eq("id", id).single();
  if (!product) notFound();

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Edit Product</h1>
      <ProductForm product={product} />
    </div>
  );
}
