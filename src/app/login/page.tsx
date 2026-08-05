"use client";

import { signIn } from "next-auth/react";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { HeartPulse } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) setError("Invalid email or password");
    else window.location.href = searchParams.get("callbackUrl") || "/";
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Sign in</CardTitle>
        <p className="text-sm text-muted-foreground">Staff login — Admin, Reception &amp; Doctor</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@clinic.com"
            type="email"
            required
          />
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            type="password"
            required
          />
          <Button type="submit" className="mt-2">
            Log in
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-card p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <HeartPulse className="size-5" />
          </div>
          <span className="font-heading text-lg font-semibold">Health HMS</span>
        </div>
        <div className="flex flex-col gap-3 max-w-md">
          <p className="font-heading text-2xl font-semibold text-balance">
            One console for the front desk, the pharmacy, and the doctor&apos;s chair.
          </p>
          <p className="text-sm text-muted-foreground">
            Appointments, billing, lab results, and prescriptions — kept in sync across every role in the clinic.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Health HMS</p>
      </div>

      <div className="flex items-center justify-center p-4">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
