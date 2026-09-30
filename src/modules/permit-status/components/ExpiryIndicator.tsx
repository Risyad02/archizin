import type { ExpiryBadge } from "../expiry";

export function ExpiryIndicator({ badge }: { badge: ExpiryBadge | null }) {
  if (!badge) return null;

  return (
    <span
      className={`ml-2 inline-block rounded px-2 py-0.5 text-xs font-medium ${badge.overdue ? "text-danger" : ""}`}
      style={
        !badge.overdue && badge.color
          ? { backgroundColor: `${badge.color}22`, color: badge.color }
          : undefined
      }
    >
      {badge.label}
    </span>
  );
}