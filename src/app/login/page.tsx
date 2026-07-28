import { AuthForm } from "@/components/AuthForm";
import { signIn } from "@/app/auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-amber-950/50 dark:text-amber-950/60">
            Log in to study your sets.
          </p>
        </div>
        <AuthForm action={signIn} mode="login" next={next} />
      </div>
    </main>
  );
}
