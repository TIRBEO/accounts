import { redirect } from "next/navigation";

// The premium OLED glassmorphism auth experience now lives at /accounts.
// Redirect there by default. Append ?keep=1 to reach the legacy login flow.
export default function LoginRedirect({ searchParams }: { searchParams: { keep?: string } }) {
  if (searchParams?.keep === "1") {
    redirect("/login-legacy");
  }
  redirect("/accounts");
}
