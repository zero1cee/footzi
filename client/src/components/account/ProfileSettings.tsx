import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/Button';

const SHARED_DEMO_EMAILS = ['patron@footzi.in', 'demo-admin@footzi.in'];

const inputClass =
  'w-full bg-ivory-50 border border-ivory-300 px-3 py-2 rounded-xs text-xs focus:outline-none focus:border-charcoal-900';

type Result = { kind: 'ok' | 'error'; text: string } | null;

const ResultBanner: React.FC<{ result: Result }> = ({ result }) =>
  result ? (
    <div
      role={result.kind === 'error' ? 'alert' : 'status'}
      className={`p-3 rounded-xs text-xs flex items-center gap-2 border ${
        result.kind === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
      }`}
    >
      {result.kind === 'ok' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
      {result.text}
    </div>
  ) : null;

export const ProfileSettings: React.FC = () => {
  const { user, updateProfile, changePassword } = useAuthStore();
  const isSharedDemo = Boolean(user && SHARED_DEMO_EMAILS.includes(user.email));

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [profileResult, setProfileResult] = useState<Result>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordResult, setPasswordResult] = useState<Result>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileResult(null);
    setSavingProfile(true);
    const failure = await updateProfile({ name: name.trim(), phone: phone.trim() });
    setSavingProfile(false);
    setProfileResult(failure ? { kind: 'error', text: failure } : { kind: 'ok', text: 'Your profile has been updated.' });
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordResult(null);
    if (next !== confirm) {
      setPasswordResult({ kind: 'error', text: 'The two new passwords do not match.' });
      return;
    }
    setSavingPassword(true);
    const failure = await changePassword(current, next);
    setSavingPassword(false);
    if (failure) {
      setPasswordResult({ kind: 'error', text: failure });
    } else {
      setCurrent('');
      setNext('');
      setConfirm('');
      setPasswordResult({ kind: 'ok', text: 'Password changed. Your other devices have been signed out.' });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form onSubmit={handleProfile} className="bg-white p-6 rounded-xs border border-ivory-200 shadow-sm space-y-4 text-xs">
        <h2 className="font-serif text-lg font-medium text-charcoal-950 border-b border-ivory-200 pb-2">Your details</h2>
        {isSharedDemo && (
          <p className="p-3 bg-sand-50 border border-sand-200 text-charcoal-700 rounded-xs">
            This is a shared demo account, so its details are read-only. Create your own account to edit them.
          </p>
        )}
        <ResultBanner result={profileResult} />
        <div>
          <label htmlFor="profile-name" className="block font-semibold text-charcoal-700 mb-1">Full name</label>
          <input id="profile-name" className={inputClass} required minLength={2} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} disabled={isSharedDemo} />
        </div>
        <div>
          <label htmlFor="profile-email" className="block font-semibold text-charcoal-700 mb-1">Email</label>
          <input id="profile-email" className={`${inputClass} opacity-70`} value={user?.email ?? ''} disabled readOnly />
          <p className="text-[11px] text-charcoal-500 mt-1">Your email is your sign-in and can't be changed here.</p>
        </div>
        <div>
          <label htmlFor="profile-phone" className="block font-semibold text-charcoal-700 mb-1">Mobile number</label>
          <input id="profile-phone" type="tel" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" disabled={isSharedDemo} />
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="sm" isLoading={savingProfile} disabled={isSharedDemo}>
            Save details
          </Button>
        </div>
      </form>

      <form onSubmit={handlePassword} className="bg-white p-6 rounded-xs border border-ivory-200 shadow-sm space-y-4 text-xs">
        <h2 className="font-serif text-lg font-medium text-charcoal-950 border-b border-ivory-200 pb-2">Change password</h2>
        {isSharedDemo && (
          <p className="p-3 bg-sand-50 border border-sand-200 text-charcoal-700 rounded-xs">
            Shared demo accounts keep their password so everyone can keep using them.
          </p>
        )}
        <ResultBanner result={passwordResult} />
        <div>
          <label htmlFor="current-password" className="block font-semibold text-charcoal-700 mb-1">Current password</label>
          <input id="current-password" type="password" autoComplete="current-password" className={inputClass} required value={current} onChange={(e) => setCurrent(e.target.value)} disabled={isSharedDemo} />
        </div>
        <div>
          <label htmlFor="next-password" className="block font-semibold text-charcoal-700 mb-1">New password</label>
          <input id="next-password" type="password" autoComplete="new-password" className={inputClass} required minLength={8} placeholder="At least 8 characters" value={next} onChange={(e) => setNext(e.target.value)} disabled={isSharedDemo} />
        </div>
        <div>
          <label htmlFor="confirm-new-password" className="block font-semibold text-charcoal-700 mb-1">Confirm new password</label>
          <input id="confirm-new-password" type="password" autoComplete="new-password" className={inputClass} required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={isSharedDemo} />
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="sm" isLoading={savingPassword} disabled={isSharedDemo}>
            Update password
          </Button>
        </div>
      </form>
    </div>
  );
};
