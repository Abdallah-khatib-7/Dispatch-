import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '@/lib/auth/AuthContext';
import { NAV_ITEMS } from './navItems';

// The nav is a working instance of the app's signature element: a tick rail.
// Each item carries a tick mark that lights up amber for the active route,
// the same visual language used for the chain-of-custody trace on the
// dashboard and detail views.
export const NavRail = () => {
  const { account, disconnect } = useAuth();

  return (
    <nav className="flex h-full flex-col justify-between border-r border-ink-line bg-ink px-3 py-6">
      <div>
        <div className="mb-8 flex items-center gap-2 px-3">
          <span className="h-4 w-px bg-teal" aria-hidden="true" />
          <span className="font-display text-sm font-semibold tracking-[0.2em] text-white">
            DISPATCH
          </span>
        </div>
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    'group flex items-center gap-3 rounded-md px-3 py-2 font-body text-sm transition-colors',
                    isActive ? 'text-white' : 'text-steel hover:text-mist',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={clsx(
                        'h-4 w-px shrink-0 transition-colors',
                        isActive ? 'bg-amber' : 'bg-ink-line group-hover:bg-steel',
                      )}
                      aria-hidden="true"
                    />
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-ink-line px-3 pt-4">
        <p className="truncate font-data text-xs text-steel" title={account ?? undefined}>
          {account}
        </p>
        <button
          type="button"
          onClick={disconnect}
          className="mt-2 font-body text-xs text-steel underline decoration-ink-line underline-offset-4 hover:text-rust"
        >
          Disconnect
        </button>
      </div>
    </nav>
  );
};
