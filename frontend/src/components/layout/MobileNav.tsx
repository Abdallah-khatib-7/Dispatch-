import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { NAV_ITEMS } from './navItems';

export const MobileNav = () => (
  <nav className="flex border-t border-ink-line bg-ink">
    {NAV_ITEMS.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        className={({ isActive }) =>
          clsx(
            'flex flex-1 flex-col items-center gap-1.5 py-3 font-body text-xs',
            isActive ? 'text-white' : 'text-steel',
          )
        }
      >
        {({ isActive }) => (
          <>
            <span
              className={clsx('h-px w-6 rounded-full', isActive ? 'bg-amber' : 'bg-ink-line')}
              aria-hidden="true"
            />
            {item.label}
          </>
        )}
      </NavLink>
    ))}
  </nav>
);
