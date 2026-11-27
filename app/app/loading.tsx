export default function Loading() {
  return (
    <div
      className="page-container py-12"
      aria-label="Loading 1Scratch"
      aria-busy="true"
    >
      <div className="skeleton h-3 w-40" />
      <div className="skeleton mt-6 h-12 w-3/4 max-w-xl" />
      <div className="skeleton mt-4 h-4 w-2/3 max-w-sm" />
      <div className="surface mt-8 grid gap-6 p-6 sm:grid-cols-2">
        <div className="space-y-4">
          <div className="skeleton h-20" />
          <div className="skeleton h-20" />
          <div className="skeleton h-20" />
          <div className="skeleton h-12" />
        </div>
        <div className="skeleton min-h-64" />
      </div>
    </div>
  );
}
