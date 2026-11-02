"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto grid max-w-xl px-4 py-16">
      <Card className="items-start">
        <span className="grid size-12 place-items-center rounded-xl bg-destructive-soft text-destructive">
          <AlertTriangle className="size-6" aria-hidden />
        </span>
        <h1 className="text-xl font-bold">We couldn&apos;t load your dashboard</h1>
        <p className="text-muted-foreground">
          This is usually a short connection problem. Check your internet, then try again.
        </p>
        <Button onClick={reset}>Try again</Button>
      </Card>
    </main>
  );
}
