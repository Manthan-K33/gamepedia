import { Gamepad2, Search } from 'lucide-react';

interface HeaderProps {
  route: string;
  onNavigate: (route: string) => void;
  search: string;
  onSearch: (value: string) => void;
}

export default function Header({ route, onNavigate, search, onSearch }: HeaderProps) {
  const isBrowse = route.startsWith('/browse');
  const isHome = route === '/' || route.startsWith('/game/');

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#121216]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <button
          onClick={() => onNavigate('/')}
          className="flex shrink-0 items-center gap-2 text-white"
        >
          <Gamepad2 className="h-7 w-7 text-sky-400" strokeWidth={2.2} />
          <span className="text-lg font-extrabold tracking-tight">
            GAME<span className="text-sky-400">PEDIA</span>
          </span>
        </button>

        <nav className="hidden items-center gap-1 md:flex">
          {[
            { label: 'Home', active: isHome, route: '/' },
            { label: 'Browse', active: isBrowse, route: '/browse' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => onNavigate(item.route)}
              className={`rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
                item.active
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <form
          className="ml-auto flex w-full max-w-sm items-center"
          onSubmit={(e) => {
            e.preventDefault();
            onNavigate('/browse');
          }}
        >
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search games..."
              className="w-full rounded-md border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-gray-500 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
            />
          </div>
        </form>

        <nav className="flex items-center gap-1 md:hidden">
          <button
            onClick={() => onNavigate('/')}
            className={`rounded px-2 py-1.5 text-sm font-semibold ${isHome ? 'text-white' : 'text-gray-400'}`}
          >
            Home
          </button>
          <button
            onClick={() => onNavigate('/browse')}
            className={`rounded px-2 py-1.5 text-sm font-semibold ${isBrowse ? 'text-white' : 'text-gray-400'}`}
          >
            Browse
          </button>
        </nav>
      </div>
    </header>
  );
}
