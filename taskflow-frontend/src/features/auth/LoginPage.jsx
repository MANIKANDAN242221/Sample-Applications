import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Input } from '../../components/common/ui';
import { useAuth } from '../../hooks/useAuth';
import { useMutation } from '../../hooks/useMutation';
import { getErrorMessage } from '../../utils/errors';

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const { run, pending, error } = useMutation(login);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    await run(form).catch(() => {}); // error is rendered from mutation state; redirect handled by route guard
  }

  return (
    <div className="center-screen">
      <form className="card auth-card" onSubmit={onSubmit} noValidate>
        <h1>Sign in to TaskFlow</h1>
        <Alert>{error && getErrorMessage(error)}</Alert>
        <Input label="Email" name="email" type="email" autoComplete="email" required value={form.email} onChange={onChange} />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={form.password}
          onChange={onChange}
        />
        <Button type="submit" loading={pending} className="btn-block">
          Sign in
        </Button>
        <p className="muted center">
          No account? <Link to="/register">Create one</Link>
        </p>
      </form>
    </div>
  );
}
