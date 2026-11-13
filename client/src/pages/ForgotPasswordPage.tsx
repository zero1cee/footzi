import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { authService } from '@/services/authService';
import { Button } from '@/components/ui/Button';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

export const ForgotPasswordPage: React.FC = () => {
  useDocumentMeta({ title: 'Forgot password — Footzi', noindex: true });
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSending(true);
    try {
      setSentMessage(await authService.forgotPassword(email.trim()));
    } catch (err: any) {
      setError(err.message || 'Could not send the reset email');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="py-12 md:py-20 bg-ivory-100 min-h-[85vh] flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="bg-white p-8 sm:p-10 rounded-xs border border-ivory-200 shadow-elevated">
          <Link to="/login" className="inline-flex items-center gap-1 text-[11px] text-charcoal-500 hover:text-charcoal-900 mb-6">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
          </Link>

          <h1 className="font-serif text-2xl font-medium text-charcoal-950">Forgot your password?</h1>
          <p className="text-xs text-charcoal-500 mt-1 mb-6">
            Enter the email on your account and we'll send a link to choose a new password.
          </p>

          {sentMessage ? (
            <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xs flex items-start gap-2" role="status">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p>{sentMessage}</p>
                <p className="mt-1 text-emerald-700">The link works for 60 minutes. Check your spam folder if it doesn't arrive.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xs" role="alert">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="forgot-email" className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Email address
                </label>
                <div className="relative">
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2 pl-9 text-xs text-charcoal-900 rounded-xs focus:outline-none focus:border-charcoal-900"
                  />
                  <Mail className="w-4 h-4 text-charcoal-400 absolute left-2.5 top-2.5" />
                </div>
              </div>
              <Button type="submit" variant="primary" size="lg" isLoading={isSending} className="w-full">
                Send reset link
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
