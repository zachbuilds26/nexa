export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`shimmer rounded bg-fill ${className}`}
      aria-hidden="true"
    />
  );
}
