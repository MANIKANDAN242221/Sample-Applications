import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Input } from '../../components/common/ui';
import { useAuth } from '../../hooks/useAuth';
import { useMutation } from '../../hooks/useMutation';
import { getErrorMessage, getFieldErrors } from '../../utils/errors';

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [localError, setLocalError] = useState('');
  const { run, pending, error } = useMutation(register);
  const fieldErrors = getFieldErrors(error);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setLocalError('Passwords do not match');
      return;
    }
    setLocalError('');
    const { confirm: _confirm, ...payload } = form;
    await run(payload).catch(() => {});
  }

  return (
    <div className="center-screen">
      <form className="card auth-card" onSubmit={onSubmit} noValidate>
        <h1>Create your account</h1>
        <Alert>{localError || (error && !Object.keys(fieldErrors).length && getErrorMessage(error))}</Alert>
        <Input label="Full name" name="name" autoComplete="name" required value={form.name} onChange={onChange} error={fieldErrors.name} />
        <Input label="Email" name="email" type="email" autoComplete="email" required value={form.email} onChange={onChange} error={fieldErrors.email} />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={form.password}
          onChange={onChange}
          error={fieldErrors.password}
          hint="At least 8 characters with upper- and lowercase letters and a digit."
        />
        <Input
          label="Confirm password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={form.confirm}
          onChange={onChange}
        />
        <Button type="submit" loading={pending} className="btn-block">
          Create account
        </Button>
        <p className="muted center">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
