import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/Button';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAuthenticated, user, loginAsDemo } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'admin') {
    return (
      <div className="py-20 md:py-32 bg-ivory-100 min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xs border border-ivory-300 shadow-elevated text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-sand-100 border border-sand-300 text-charcoal-900 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7 text-charcoal-900" />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-medium text-charcoal-950">
              Admin Deck Restricted
            </h2>
            <p className="text-xs text-charcoal-500 mt-1.5 leading-relaxed">
              You are currently signed in as <strong>{user?.name}</strong> (Patron). 
              Accessing the operations desk requires administrator privileges.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2.5">
            <Button
              variant="primary"
              size="md"
              onClick={async () => {
                await loginAsDemo('admin');
              }}
              className="w-full gap-2 text-xs"
            >
              <Sparkles className="w-3.5 h-3.5" /> Switch to Admin Deck (1-Click)
            </Button>
            <Link to="/account">
              <Button variant="outline" size="md" className="w-full gap-2 text-xs">
                <ArrowLeft className="w-3.5 h-3.5" /> Return to Patron Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
