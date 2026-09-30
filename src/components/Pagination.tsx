import { buildPageList } from "../lib/pagination";

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const items = buildPageList(page, totalPages);

  return (
    <nav className="mt-4 flex flex-wrap items-center justify-center gap-1" aria-label="Navigasi halaman">
      <button
        type="button"
        className="btn-secondary btn-sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Sebelumnya
      </button>
      {items.map((item, idx) =>
        item === "ellipsis" ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-ink-muted">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            className={item === page ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
            aria-current={item === page ? "page" : undefined}
            onClick={() => onPageChange(item)}
          >
            {item}
          </button>
        )
      )}
      <button
        type="button"
        className="btn-secondary btn-sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Selanjutnya
      </button>
    </nav>
  );
}