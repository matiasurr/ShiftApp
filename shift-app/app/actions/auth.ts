"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
  redirectTo: z.string().optional(),
});

export type SignInState =
  | { status: "idle" }
  | { status: "error"; message: string };

// Email/password sign-in for stylists. Designed for useActionState.
export async function signIn(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo") ?? undefined,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid input.";
    return { status: "error", message: first };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { status: "error", message: "Invalid email or password." };
  }

  const dest =
    parsed.data.redirectTo && parsed.data.redirectTo.startsWith("/stylist")
      ? parsed.data.redirectTo
      : "/stylist";
  redirect(dest);
}

// Sign the current stylist out and return to the login page.
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
