import { ProductForm } from "@/components/product-form";

export default function NewProductPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Add Product</h1>
      <ProductForm />
    </div>
  );
}
