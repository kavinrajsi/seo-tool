"use client";

import Link from "next/link";

export default function DashboardError({ error, reset }) {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="rounded-xl bg-card p-8 text-center ring-1 ring-foreground/10 space-y-4 max-w-md">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">
          {error?.message || "An unexpected error occurred."}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
