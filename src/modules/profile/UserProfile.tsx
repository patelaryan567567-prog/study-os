import { useEffect, useState, type FormEvent } from 'react';
import { LogOut, Save, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PageContainer } from '@/components/layout/PageContainer';
import { signOut, updateDisplayName } from '@/services/auth';
import { updateUserProfile } from '@/services/firestoreService';
import { useAppStore } from '@/store';
import { getXPProgress } from '@/utils';

export function UserProfile() {
  const { user, setUser } = useAppStore();
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setName(user?.name ?? ''), [user?.name]);

  if (!user) return null;

  const xp = getXPProgress(user.xp);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await updateDisplayName(name);
      await updateUserProfile(user.id, { displayName: name.trim() });
      setUser({ ...user, name: name.trim() });
      setMessage('Profile updated.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update your profile.');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    setError(null);
    try {
      await signOut();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign out.');
    }
  }

  return (
    <PageContainer className="max-w-4xl">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-[#38bdf8] text-lg font-bold text-white">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm text-[var(--color-text-secondary)]">Your StudyOS profile</p>
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">{user.name}</h2>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <Card padding="lg">
          <form className="space-y-5" onSubmit={handleSave}>
            <div className="flex items-center gap-2">
              <UserRound size={18} className="text-[var(--color-accent)]" />
              <h3 className="font-semibold text-[var(--color-text-primary)]">Account details</h3>
            </div>
            <Input label="Display name" value={name} onChange={(event) => setName(event.target.value)} required />
            <Input label="Email address" value={user.email} disabled />
            {error && <p className="rounded-xl bg-[var(--color-danger)]/10 px-3 py-2 text-xs text-[var(--color-danger)]">{error}</p>}
            {message && <p className="rounded-xl bg-[var(--color-success)]/10 px-3 py-2 text-xs text-[var(--color-success)]">{message}</p>}
            <Button type="submit" variant="primary" loading={saving}>
              <Save size={16} />
              Save profile
            </Button>
          </form>
        </Card>

        <div className="space-y-5">
          <Card padding="lg">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Learning level</p>
            <p className="mt-2 text-3xl font-bold text-[var(--color-text-primary)]">Level {user.level}</p>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{xp.current} / {xp.required} XP to level {xp.level + 1}</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${xp.percent}%` }} />
            </div>
          </Card>

          <Card padding="lg">
            <p className="text-sm text-[var(--color-text-secondary)]">Ready to leave for now?</p>
            <Button variant="danger" onClick={handleLogout} className="mt-4">
              <LogOut size={16} />
              Sign out
            </Button>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
