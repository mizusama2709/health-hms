"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) setError("Invalid email or password");
    else window.location.href = "/";
  }

  return (
    <main style={{ maxWidth: 320, margin: "80px auto" }}>
      <h1>Log in</h1>
      <form onSubmit={handleSubmit}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
        <button type="submit">Log in</button>
      </form>
      {error && <p>{error}</p>}
    </main>
  );
}
