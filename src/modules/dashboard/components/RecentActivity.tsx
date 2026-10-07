// src/modules/dashboard/components/RecentActivity.tsx
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getRecentActivity } from "../service";
import { formatActivityTime } from "../activity";
import { useAuthStore } from "../../../store/authStore";

/**
 * Panel aktivitas terbaru. Hanya dirender oleh DashboardPage untuk role dengan audit:view,
 * dan service tetap menolak role lain (UI hanya menyembunyikan, service yang menjaga).
 * Hook ada di komponen sendiri supaya urutannya tidak terpengaruh early-return di halaman.
 */
export function RecentActivity({ now }: { now: Date }) {
  const currentUser = useAuthStore((s) => s.currentUser);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-activity", currentUser?.id],
    queryFn: () => {
      if (!currentUser) throw new Error("Tidak ada sesi login");
      return getRecentActivity(currentUser);
    },
    enabled: Boolean(currentUser),
  });

  return (
    <section className="panel" aria-label="Aktivitas terbaru">
      <h2 className="section-title mb-3">Aktivitas Terbaru</h2>

      {isLoading ? (
        <p className="text-sm text-ink-muted">Memuat...</p>
      ) : isError || !data ? (
        <p className="text-sm text-danger">Aktivitas gagal dimuat.</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-ink-muted">Belum ada aktivitas tercatat.</p>
      ) : (
        <ul className="divide-y divide-line">
          {data.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
              <span className="min-w-0">
                {item.recordId === null ? (
                  <span className="block truncate">{item.description}</span>
                ) : (
                  <Link
                    to={`/permit-records/${item.recordId}`}
                    className="block truncate hover:underline"
                  >
                    {item.description}
                  </Link>
                )}
                <span className="block truncate text-xs text-ink-muted">{item.actorName}</span>
              </span>
              <span className="shrink-0 text-xs text-ink-muted tabular-nums">
                {formatActivityTime(item.timestamp, now)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Link to="/audit-log" className="btn-text mt-3 inline-block text-sm">
        Lihat semua aktivitas
      </Link>
    </section>
  );
}