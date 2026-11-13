import React, { Suspense, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnnouncementBar } from '@/components/common/AnnouncementBar';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';
import { CartDrawer } from '@/components/common/CartDrawer';
import { QuickViewModal } from '@/components/common/QuickViewModal';
import { RouteErrorBoundary } from '@/components/common/RouteErrorBoundary';

export const MainLayout: React.FC = () => {
  const { pathname } = useLocation();

  // Scroll to top on route change
  const mainRef = useRef<HTMLElement>(null);
  const section = useRef(pathname.split('/')[1]);

  useEffect(() => {
    window.scrollTo(0, 0);
    // Screen readers are told the page changed by moving focus to the new content. Switching tabs inside
    // one section (e.g. /account/orders to /account/returns) keeps focus where it is.
    const next = pathname.split('/')[1];
    if (next !== section.current) {
      section.current = next;
      mainRef.current?.focus({ preventScroll: true });
    }
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-ivory-100 text-charcoal-900 selection:bg-sand-300 selection:text-charcoal-950 font-sans">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:bg-charcoal-900 focus:text-ivory-50 focus:px-4 focus:py-2 focus:text-xs focus:uppercase focus:tracking-widest"
      >
        Skip to main content
      </a>
      <AnnouncementBar />
      <Navbar />

      <main id="main-content" ref={mainRef} tabIndex={-1} className="flex-1 focus:outline-none">
        <RouteErrorBoundary resetKey={pathname}>
        <Suspense
          fallback={
            <div role="status" aria-live="polite" className="py-32 text-center text-xs uppercase tracking-widest text-charcoal-500">
              Loading…
            </div>
          }
        >
          <Outlet />
        </Suspense>
        </RouteErrorBoundary>
      </main>

      <Footer />

      {/* Global Modals & Drawers */}
      <CartDrawer />
      <QuickViewModal />
    </div>
  );
};
