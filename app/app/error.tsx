"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="page-container py-24">
      <div className="surface mx-auto max-w-md p-8 text-center">
        <p className="eyebrow">LET’S TRY THAT AGAIN</p>
        <h1 className="mt-4 font-display text-3xl tracking-tight">
          The desk hit a snag.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Your wallet and on-chain cards are still there. Reload the desk to
          continue.
        </p>
        <button onClick={reset} className="button-primary mt-6">
          Try again
        </button>
      </div>
    </div>
  );
}
