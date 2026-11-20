import { Gamepad2 } from 'lucide-react';

export default function Footer() {
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
          <p className="text-center text-xs leading-relaxed text-gray-500 sm:text-right">
            GamePedia is a game information wiki. Prices and availability are
            shown for reference only — purchases happen on the linked stores.
          </p>
        </div>
      </div>
    </footer>
  );
}
