"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { AuthFormState } from "@/app/auth/actions";

type Props = {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  mode: "login" | "signup";
  next?: string;
};

const initialState: AuthFormState = { error: "" };

export function AuthForm({ action, mode, next }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const isLogin = mode === "login";

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-amber-950/80">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-lg border border-amber-900/20 bg-surface px-3.5 py-2.5 text-base outline-none transition focus:border-rose-400"
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-amber-950/80">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={isLogin ? "current-password" : "new-password"}
          className="w-full rounded-lg border border-amber-900/20 bg-surface px-3.5 py-2.5 text-base outline-none transition focus:border-rose-400"
          placeholder="••••••••"
        />
      </div>

      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}

      {state.message ? (
        <p className="text-sm text-emerald-600" role="status">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-full rounded-lg bg-rose-400 px-4 py-2.5 text-base font-medium text-rose-contrast transition hover:bg-rose-300 disabled:opacity-60"
      >
        {pending ? "Please wait…" : isLogin ? "Log in" : "Create account"}
      </button>

      <p className="text-center text-sm text-amber-950/50">
        {isLogin ? (
          <>
            New to Quiznik?{" "}
            <Link href="/signup" className="font-medium text-amber-950 underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-amber-950 underline">
              Log in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
