import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/Button';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

export const LoginPage: React.FC = () => {
  useDocumentMeta({ title: 'Sign in — Footzi', noindex: true });
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Return to previous target or account
  const from = (location.state as any)?.from?.pathname || '/account';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const success = await login(email, password);
    if (success) {
      if (email.includes('admin')) {
        navigate('/admin');
      } else {
        navigate(from, { replace: true });
      }
    }
  };

  const handleInstantDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Footzi@2026');
    clearError();
    const success = await login(demoEmail, 'Footzi@2026');
    if (success) {
      if (demoEmail.includes('admin')) {
        navigate('/admin');
      } else {
        navigate(from, { replace: true });
      }
    }
  };

  return (
    <div className="py-12 md:py-20 bg-ivory-100 min-h-[85vh] flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4">
        
        {/* Card */}
        <div className="bg-white p-8 sm:p-10 rounded-xs border border-ivory-200 shadow-elevated relative">
          
          {/* Header */}
          <div className="text-center mb-8">
            <span className="text-[10px] uppercase tracking-ultra text-sand-600 font-semibold block mb-1">
              Agra Atelier Privé
            </span>
            <h1 className="font-serif text-3xl font-medium text-charcoal-950">
              Sign In to Footzi
            </h1>
            <p className="text-xs text-charcoal-500 mt-1 font-light">
              Access your order chronicles, size exchanges, and curated wishlist.
            </p>
          </div>

          {/* Quick Demo Credentials Bar */}
          <div className="mb-6 p-3 bg-ivory-100/90 border border-ivory-300 rounded-xs">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-charcoal-700 block mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-sand-500" /> 1-Click Instant Demo Login:
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleInstantDemoLogin('patron@footzi.in')}
                className="flex-1 py-1.5 px-2 bg-white hover:bg-ivory-200 text-charcoal-800 text-[11px] font-medium border border-ivory-300 rounded-xs transition-colors flex items-center justify-center gap-1"
              >
                Patron Demo
              </button>
              <button
                type="button"
                onClick={() => handleInstantDemoLogin('demo-admin@footzi.in')}
                className="flex-1 py-1.5 px-2 bg-charcoal-900 hover:bg-charcoal-800 text-white text-[11px] font-medium rounded-xs transition-colors flex items-center justify-center gap-1"
              >
                Admin Demo (read-only)
              </button>
            </div>
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
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="patron@footzi.in"
                  className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2 pl-9 text-xs text-charcoal-900 rounded-xs focus:outline-none focus:border-charcoal-900"
                />
                <Mail className="w-4 h-4 text-charcoal-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-charcoal-700">
                  Password
                </label>
                <Link to="/forgot-password" className="text-[11px] text-sand-600 hover:text-sand-800">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2 pl-9 pr-9 text-xs text-charcoal-900 rounded-xs focus:outline-none focus:border-charcoal-900"
                />
                <Lock className="w-4 h-4 text-charcoal-400 absolute left-2.5 top-2.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-2.5 top-2.5 text-charcoal-400 hover:text-charcoal-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full flex items-center justify-center gap-2 mt-2"
            >
              Enter Footzi Privé <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Footer note */}
          <div className="mt-8 pt-6 border-t border-ivory-200 text-center">
            <p className="text-xs text-charcoal-500">
              First time patron?{' '}
              <Link to="/register" className="font-semibold text-charcoal-900 hover:text-sand-600 underline">
                Create an Account
              </Link>
            </p>
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-charcoal-400">
            <ShieldCheck className="w-3.5 h-3.5 text-sand-500" />
            <span>256-Bit Encrypted Secure JWT Token Storage</span>
          </div>

        </div>

      </div>
    </div>
  );
};
