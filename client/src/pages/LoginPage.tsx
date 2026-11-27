import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Truck,
  RotateCcw,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/Button';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

export const LoginPage: React.FC = () => {
  useDocumentMeta({ title: 'Sign In — Footzi Privé', noindex: true });
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showDemoAccess, setShowDemoAccess] = useState(false);

  // Return to previous target or account
  const fromState = (location.state as any)?.from;
  const from = fromState?.pathname
    ? `${fromState.pathname}${fromState.search || ''}${fromState.hash || ''}`
    : '/account';

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const success = await login(email.trim(), password);
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

  const handlePasswordKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(e.getModifierState('CapsLock'));
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-ivory-100 flex flex-col lg:flex-row">
      {/* Left Column: Editorial Brand Showcase (Desktop only) */}
      <div className="hidden lg:flex lg:w-5/12 relative overflow-hidden bg-charcoal-950 flex-col justify-between p-12 text-ivory-100 border-r border-charcoal-800">
        {/* Background Workshop Photo with Luxury Gradient Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-35 scale-105 transition-transform duration-1000"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=1200&q=85)',
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-charcoal-950 via-charcoal-950/85 to-charcoal-950/70"
          aria-hidden="true"
        />

        {/* Top Editorial Identity */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-ultra text-sand-300 font-semibold bg-charcoal-900/80 px-3 py-1 rounded-full border border-sand-500/30">
            <Sparkles className="w-3 h-3 text-sand-400" />
            <span>Agra Atelier Privé</span>
          </div>
          <p className="font-serif text-3xl xl:text-4xl font-medium text-ivory-50 mt-6 leading-tight">
            “Every stitch an ode to four centuries of Agra cordwaining heritage.”
          </p>
          <p className="text-xs text-ivory-300 font-light mt-3 leading-relaxed max-w-sm">
            Hand-burnished full-grain calfskin crafted by generational master artisans in Agra, Uttar Pradesh.
          </p>
        </div>

        {/* Middle: Patron Privilege Pillars */}
        <div className="relative z-10 space-y-4 my-8">
          <h2 className="text-[11px] uppercase tracking-widest text-sand-400 font-semibold mb-2">
            Patron Privileges
          </h2>
          <div className="flex items-start gap-3 bg-charcoal-900/60 p-3.5 rounded-xs border border-charcoal-800 backdrop-blur-xs">
            <Truck className="w-4 h-4 text-sand-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-ivory-100">Workshop-Direct Delhivery Express</p>
              <p className="text-[11px] text-charcoal-300 mt-0.5">
                Dispatched directly from our Agra workshop with real-time SMS & AWB tracking.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-charcoal-900/60 p-3.5 rounded-xs border border-charcoal-800 backdrop-blur-xs">
            <RotateCcw className="w-4 h-4 text-sand-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-ivory-100">Complimentary 7-Day Size Exchanges</p>
              <p className="text-[11px] text-charcoal-300 mt-0.5">
                Doorstep pickup and replacement pair dispatched in your ideal Indian fit.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-charcoal-900/60 p-3.5 rounded-xs border border-charcoal-800 backdrop-blur-xs">
            <Sparkles className="w-4 h-4 text-sand-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-ivory-100">Curated Private Wishlist & Orders</p>
              <p className="text-[11px] text-charcoal-300 mt-0.5">
                Early reservation rights on seasonal vegetable-tanned patina batches.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Seal */}
        <div className="relative z-10 pt-6 border-t border-charcoal-800/80 flex items-center justify-between text-[11px] text-charcoal-400">
          <span>Crafted in Agra • India</span>
          <span>100% Genuine Calfskin</span>
        </div>
      </div>

      {/* Right Column: Sign-In Authentication Experience */}
      <div className="flex-1 flex flex-col justify-center items-center py-10 px-4 sm:px-8 lg:px-12 bg-ivory-100">
        <div className="max-w-md w-full">
          {/* Card Container */}
          <div className="bg-white p-7 sm:p-10 rounded-xs border border-ivory-200 shadow-elevated relative">
            {/* Header */}
            <div className="text-center mb-6">
              <span className="text-[10px] uppercase tracking-ultra text-sand-600 font-semibold block mb-1">
                Atelier Account Portal
              </span>
              <h1 className="font-serif text-3xl font-medium text-charcoal-950">
                Sign In to Footzi
              </h1>
              <p className="text-xs text-charcoal-500 mt-1 font-light">
                Enter your credentials to access your orders, size exchanges, and private wishlist.
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div
                role="alert"
                className="mb-5 p-3.5 bg-red-50/90 border border-red-200 text-red-700 text-xs rounded-xs flex items-center gap-2 animate-fade-in"
              >
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-[11px] uppercase tracking-wider font-semibold text-charcoal-700 mb-1"
                >
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="patron@footzi.in"
                    className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2.5 pl-9 pr-9 text-xs text-charcoal-900 rounded-xs focus:outline-none focus:border-charcoal-900 focus:ring-1 focus:ring-charcoal-900 transition-colors"
                  />
                  <Mail className="w-4 h-4 text-charcoal-400 absolute left-2.5 top-3 pointer-events-none" />
                  {isEmailValid && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-2.5 top-3 pointer-events-none" />
                  )}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label
                    htmlFor="login-password"
                    className="block text-[11px] uppercase tracking-wider font-semibold text-charcoal-700"
                  >
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-[11px] text-sand-600 hover:text-sand-800 underline transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handlePasswordKey}
                    onKeyUp={handlePasswordKey}
                    placeholder="••••••••"
                    className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2.5 pl-9 pr-10 text-xs text-charcoal-900 rounded-xs focus:outline-none focus:border-charcoal-900 focus:ring-1 focus:ring-charcoal-900 transition-colors"
                  />
                  <Lock className="w-4 h-4 text-charcoal-400 absolute left-2.5 top-3 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute right-0 top-0 h-full w-10 flex items-center justify-center text-charcoal-400 hover:text-charcoal-800 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* CapsLock Warning */}
                {capsLockOn && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xs mt-1.5 animate-fade-in">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>CapsLock is active on your keyboard</span>
                  </div>
                )}
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 accent-charcoal-900 rounded-xs border-ivory-300 text-charcoal-900 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-[11px] text-charcoal-600">Remember this device for 30 days</span>
                </label>
              </div>

              {/* Primary Submit */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full flex items-center justify-center gap-2 mt-2 shadow-md hover:shadow-lg transition-all"
              >
                Enter Footzi Privé <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            {/* Guest Order Bridge */}
            <div className="mt-6 pt-5 border-t border-ivory-200">
              <div className="p-3 bg-ivory-100 rounded-xs border border-ivory-300/80 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-charcoal-900">Placed an order as a guest?</span>
                  <span className="text-[10px] text-charcoal-500">Track shipment using your Phone & Order ID</span>
                </div>
                <Link
                  to="/track-order"
                  className="text-[11px] font-medium text-sand-700 hover:text-charcoal-950 flex items-center gap-1 shrink-0 ml-2"
                >
                  Track <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Registration Callout */}
            <div className="mt-5 text-center">
              <p className="text-xs text-charcoal-600">
                First time patron?{' '}
                <Link
                  to="/register"
                  className="font-semibold text-charcoal-950 hover:text-sand-600 underline transition-colors"
                >
                  Create an Account
                </Link>
              </p>
            </div>

            {/* Trust and Encryption Badges */}
            <div className="mt-6 pt-4 border-t border-ivory-200 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-charcoal-400 text-center">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-sand-500" /> 256-Bit SSL Encrypted
              </span>
              <span>•</span>
              <span>RBI-Compliant Protection</span>
            </div>
          </div>

          {/* Discreet Production-Grade Demo Quick-Access */}
          <div className="mt-6 text-center">
            {!showDemoAccess ? (
              <button
                type="button"
                onClick={() => setShowDemoAccess(true)}
                className="text-[11px] text-charcoal-400 hover:text-charcoal-700 transition-colors inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3 text-sand-500" />
                <span>Reviewing or Testing Footzi? Click for Instant Demo Credentials</span>
              </button>
            ) : (
              <div className="p-3.5 bg-white border border-ivory-300 rounded-xs shadow-subtle animate-fade-in text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-charcoal-800 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-sand-500" /> Instant Demo Access (Pre-populated)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDemoAccess(false)}
                    className="text-[10px] text-charcoal-400 hover:text-charcoal-700"
                  >
                    Hide
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleInstantDemoLogin('patron@footzi.in')}
                    className="flex-1 py-1.5 px-2 bg-ivory-100 hover:bg-ivory-200 text-charcoal-800 text-[11px] font-medium border border-ivory-300 rounded-xs transition-colors flex items-center justify-center gap-1"
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
