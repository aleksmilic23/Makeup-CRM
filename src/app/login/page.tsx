import { Suspense } from "react";
import { Sparkles } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Log in · SairaOBeauty" };

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-pink-50/50 px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-pink-500" />
          <span className="font-semibold text-sm tracking-tight">SairaOBeauty</span>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
