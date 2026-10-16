"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { KerenMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAction, type ActionState } from "./actions";

const initialState: ActionState = {};

export default function RegisterPage() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  useEffect(() => {
    if (state.success) {
      const form = document.getElementById("register-form") as HTMLFormElement | null;
      const email = (form?.elements.namedItem("email") as HTMLInputElement | null)?.value;
      const password = (form?.elements.namedItem("password") as HTMLInputElement | null)?.value;
      if (email && password) {
        signIn("credentials", { email, password, redirect: false }).then(() => {
          router.push("/onboarding");
        });
      }
    }
  }, [state.success, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center">
          <KerenMark className="h-10 w-10" />
        </Link>
        <h1 className="text-center text-xl font-bold text-ink">Create your Keren account</h1>
        <p className="mb-6 text-center text-sm text-stone">Turn opportunities into capital.</p>

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
        >
          Continue with Google
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs text-stone">
          <div className="h-px flex-1 bg-line" />
          or
          <div className="h-px flex-1 bg-line" />
        </div>

        <form id="register-form" action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" required />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required minLength={8} />
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-stone">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-ink underline underline-offset-2">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
