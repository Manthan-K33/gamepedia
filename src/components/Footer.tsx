import { useEffect, useState } from 'react';
import { Gamepad2 } from 'lucide-react';
import { fetchCatalogGeneratedAt, formatSnapshotDate } from '@/lib/games';

export default function Footer() {
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCatalogGeneratedAt()
      .then((value) => {
        if (!cancelled) setUpdatedAt(value);
      })
      .catch(() => {
        // The footer date is informational; a failure must not break the page.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer className="border-t border-white/10 bg-[#0e0e12]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2 text-white">
            <Gamepad2 className="h-6 w-6 text-sky-400" />
            <span className="font-extrabold tracking-tight">
              GAME<span className="text-sky-400">PEDIA</span>
            </span>
          </div>
          <div className="space-y-1 text-center text-xs leading-relaxed text-gray-400 sm:text-right">
            {updatedAt && (
              <p>Prices last checked {formatSnapshotDate(updatedAt)}</p>
            )}
            <p>
              GamePedia is a game information wiki. Prices and availability are
              shown for reference only — purchases happen on the linked stores.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
