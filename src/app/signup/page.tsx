import { AuthForm } from "@/components/AuthForm";
import { signUp } from "@/app/auth/actions";

export default function SignupPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm text-amber-950/50">
            Free to use. Your sets are saved to your account.
          </p>
        </div>
        <AuthForm action={signUp} mode="signup" />
      </div>
    </main>
  );
}
