import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, User, Phone, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/Button';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

export const RegisterPage: React.FC = () => {
  useDocumentMeta({ title: 'Create your account — Footzi', noindex: true });
  const navigate = useNavigate();
  const location = useLocation();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const success = await register(name, email, password, phone);
    if (success) {
      const fromState = (location.state as any)?.from;
      navigate(fromState?.pathname ? `${fromState.pathname}${fromState.search || ''}${fromState.hash || ''}` : '/account');
    }
  };

  return (
    <div className="py-12 md:py-20 bg-ivory-100 min-h-[85vh] flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4">
        
        <div className="bg-white p-8 sm:p-10 rounded-xs border border-ivory-200 shadow-elevated relative">
          
          {/* Header */}
          <div className="text-center mb-8">
            <span className="text-[10px] uppercase tracking-ultra text-sand-600 font-semibold block mb-1">
              Join Footzi Privé
            </span>
            <h1 className="font-serif text-3xl font-medium text-charcoal-950">
              Create Patron Account
            </h1>
            <p className="text-xs text-charcoal-500 mt-1 font-light">
              Enjoy private releases, complimentary size exchanges, and order tracking.
            </p>
          </div>

          {/* Welcome Offer Banner */}
          <div className="mb-6 p-3 bg-sand-50 border border-sand-200 rounded-xs flex items-center gap-2 text-xs text-sand-800">
            <Sparkles className="w-4 h-4 text-sand-600 shrink-0" />
            <span>
              Privilege gift: Enjoy <strong>15% off</strong> your inaugural order with code <strong>AGRAFIRST</strong>.
            </span>
          </div>

          {/* Error Banner */}
          {error && (
            <div role="alert" className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xs">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-charcoal-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Vikramaditya Sen"
                  className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2 pl-9 text-xs text-charcoal-900 rounded-xs focus:outline-none focus:border-charcoal-900"
                />
                <User className="w-4 h-4 text-charcoal-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-charcoal-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vikram@example.com"
                  className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2 pl-9 text-xs text-charcoal-900 rounded-xs focus:outline-none focus:border-charcoal-900"
                />
                <Mail className="w-4 h-4 text-charcoal-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-charcoal-700 mb-1">
                Mobile Number (for SMS & WhatsApp Dispatch Alerts)
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2 pl-9 text-xs text-charcoal-900 rounded-xs focus:outline-none focus:border-charcoal-900"
                />
                <Phone className="w-4 h-4 text-charcoal-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-charcoal-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2 pl-9 text-xs text-charcoal-900 rounded-xs focus:outline-none focus:border-charcoal-900"
                />
                <Lock className="w-4 h-4 text-charcoal-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full flex items-center justify-center gap-2 mt-3"
            >
              Complete Registration <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Footer note */}
          <div className="mt-8 pt-6 border-t border-ivory-200 text-center">
            <p className="text-xs text-charcoal-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-charcoal-900 hover:text-sand-600 underline">
                Sign In
              </Link>
            </p>
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-charcoal-400">
            <ShieldCheck className="w-3.5 h-3.5 text-sand-500" />
            <span>Strict data confidentiality. Zero spam.</span>
          </div>

        </div>

      </div>
    </div>
  );
};
