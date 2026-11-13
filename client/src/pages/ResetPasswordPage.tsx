import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/Button';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

export const ResetPasswordPage: React.FC = () => {
  useDocumentMeta({ title: 'Choose a new password — Footzi', noindex: true });
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const resetPassword = useAuthStore((s) => s.resetPassword);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setIsSaving(true);
    const failure = await resetPassword(token, password);
    setIsSaving(false);
    if (failure) {
      setError(failure);
    } else {
      navigate('/account');
    }
  };

  return (
    <div className="py-12 md:py-20 bg-ivory-100 min-h-[85vh] flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="bg-white p-8 sm:p-10 rounded-xs border border-ivory-200 shadow-elevated">
          <h1 className="font-serif text-2xl font-medium text-charcoal-950">Choose a new password</h1>

          {!token ? (
            <div className="mt-4 text-xs text-charcoal-600">
              <p>This reset link is incomplete. Please request a new one.</p>
              <Link to="/forgot-password" className="inline-block mt-3 font-semibold text-charcoal-900 underline">
                Request a new link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xs" role="alert">
                  {error}{' '}
                  {/invalid or has expired/i.test(error) && (
                    <Link to="/forgot-password" className="underline font-semibold">
                      Request a new link
                    </Link>
                  )}
                </div>
              )}
              <div>
                <label htmlFor="new-password" className="block text-xs font-semibold text-charcoal-700 mb-1">
                  New password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2 pl-9 text-xs text-charcoal-900 rounded-xs focus:outline-none focus:border-charcoal-900"
                  />
                  <Lock className="w-4 h-4 text-charcoal-400 absolute left-2.5 top-2.5" />
                </div>
              </div>
              <div>
                <label htmlFor="confirm-password" className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Confirm new password
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2 pl-9 text-xs text-charcoal-900 rounded-xs focus:outline-none focus:border-charcoal-900"
                  />
                  <Lock className="w-4 h-4 text-charcoal-400 absolute left-2.5 top-2.5" />
                </div>
              </div>
              <Button type="submit" variant="primary" size="lg" isLoading={isSaving} className="w-full">
                Update password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
