import { useState } from 'react';
import { authApi } from '../../api/authApi';
import { Alert, Button, Input } from '../../components/common/ui';
import { RoleBadge } from '../../components/common/StatusBadges';
import { useAuth } from '../../hooks/useAuth';
import { useMutation } from '../../hooks/useMutation';
import { getErrorMessage, getFieldErrors } from '../../utils/errors';

export default function ProfilePage() {
  const { user, updateUser, logoutAll, endSession } = useAuth();
  const [name, setName] = useState(user.name);
  const [saved, setSaved] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [mismatch, setMismatch] = useState(false);

  const profile = useMutation(async () => {
    const updated = await authApi.updateProfile({ name: name.trim() });
    updateUser({ name: updated.name });
    setSaved(true);
  });

  const password = useMutation(async () => {
    const { confirm: _c, ...payload } = passwords;
    await authApi.changePassword(payload);
    endSession(); // the server revoked all sessions; sign in again with the new password
  });
  const pwFieldErrors = getFieldErrors(password.error);

  const onPwChange = (e) => setPasswords((p) => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <section className="narrow-section">
      <header className="page-header">
        <h1>Profile</h1>
      </header>

      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(false);
          profile.run().catch(() => {});
        }}
      >
        <h2>Account</h2>
        <p className="muted">
          {user.email} · <RoleBadge role={user.role} />
        </p>
        {saved && <Alert type="success">Profile updated.</Alert>}
        <Alert>{profile.error && getErrorMessage(profile.error)}</Alert>
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={120} required />
        <Button type="submit" loading={profile.pending} disabled={name.trim() === user.name}>
          Save
        </Button>
      </form>

      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          const different = passwords.newPassword !== passwords.confirm;
          setMismatch(different);
          if (!different) password.run().catch(() => {});
        }}
        noValidate
      >
        <h2>Change password</h2>
        <p className="muted small">You will be signed out of all devices after changing your password.</p>
        <Alert>{password.error && !Object.keys(pwFieldErrors).length && getErrorMessage(password.error)}</Alert>
        <Input label="Current password" name="currentPassword" type="password" autoComplete="current-password" value={passwords.currentPassword} onChange={onPwChange} />
        <Input
          label="New password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          value={passwords.newPassword}
          onChange={onPwChange}
          error={pwFieldErrors.newPassword}
          hint="At least 8 characters with upper- and lowercase letters and a digit."
        />
        <Input
          label="Confirm new password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          value={passwords.confirm}
          onChange={onPwChange}
          error={mismatch ? 'Passwords do not match' : undefined}
        />
        <Button type="submit" loading={password.pending}>
          Change password
        </Button>
      </form>

      <div className="card">
        <h2>Sessions</h2>
        <p className="muted">Sign out of TaskFlow on every browser and device.</p>
        <Button variant="danger" onClick={logoutAll}>
          Sign out everywhere
        </Button>
      </div>
    </section>
  );
}
