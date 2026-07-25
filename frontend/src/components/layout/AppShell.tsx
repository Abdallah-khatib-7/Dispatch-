import { Outlet } from 'react-router-dom';
import { NavRail } from './NavRail';
import { MobileNav } from './MobileNav';

export const AppShell = () => (
  <div className="flex min-h-screen flex-col bg-ink md:flex-row">
    <div className="hidden md:block md:w-56 md:shrink-0">
      <div className="fixed h-screen w-56">
        <NavRail />
      </div>
    </div>

    <div className="flex flex-1 flex-col pb-16 md:pb-0">
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-10">
        <Outlet />
      </main>
    </div>

    <div className="fixed inset-x-0 bottom-0 z-10 md:hidden">
      <MobileNav />
    </div>
  </div>
);
