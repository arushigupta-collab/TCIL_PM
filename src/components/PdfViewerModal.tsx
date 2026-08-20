import { useEffect } from "react";
import { X, ExternalLink, Download } from "../lib/icons";

/** Full-screen modal that embeds the served RFP PDF. */
export function PdfViewerModal({
  url,
  title,
  subtitle,
  onClose,
}: {
  url: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink/70 p-4 sm:p-8">
      <div
        className="animate-fade absolute inset-0"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-stone-200 px-5 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-ink">{title}</h2>
            {subtitle ? (
              <p className="truncate text-xs text-stone-500">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-50"
            >
              <ExternalLink width={14} height={14} />
              New tab
            </a>
            <a
              href={url}
              download
              className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-50"
            >
              <Download width={14} height={14} />
              Download
            </a>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-ink"
            >
              <X width={18} height={18} />
            </button>
          </div>
        </div>
        {/* Embedded PDF */}
        <iframe
          src={`${url}#view=FitH`}
          title={title}
          className="min-h-0 flex-1 bg-stone-100"
        />
      </div>
    </div>
  );
}
