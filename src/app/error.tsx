"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <p className="text-sm text-muted-foreground">Please try again, or go back to the homepage.</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button onClick={() => reset()}>Try again</Button>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Go home
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
