import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { useRegister } from '../api/hooks';
import type { RoleId } from '../stores/useAuthStore';

export default function Register() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const registerMutation = useRegister();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const data = await registerMutation.mutateAsync({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
      });
      login({
        accessToken: data.accessToken,
        user: {
          id: data.user.id,
          email: data.user.email,
          name: `${data.user.firstName} ${data.user.lastName}`,
          roleId: data.user.roleLevel as RoleId,
        },
      });
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-6">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#0A3D39] text-white text-sm font-bold">
            G
          </span>
          <span className="text-lg font-semibold text-[#0A3D39]">Green Mark RMS</span>
        </div>

        <h2 className="text-xl font-semibold text-slate-800 mb-1">Create account</h2>
        <p className="text-sm text-slate-500 mb-6">Register to start ordering</p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A3D39] focus:outline-none focus:ring-1 focus:ring-[#0A3D39]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A3D39] focus:outline-none focus:ring-1 focus:ring-[#0A3D39]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A3D39] focus:outline-none focus:ring-1 focus:ring-[#0A3D39]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone (optional)</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A3D39] focus:outline-none focus:ring-1 focus:ring-[#0A3D39]"
              placeholder="+251..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A3D39] focus:outline-none focus:ring-1 focus:ring-[#0A3D39]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => updateField('confirmPassword', e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A3D39] focus:outline-none focus:ring-1 focus:ring-[#0A3D39]"
            />
          </div>

          <button
            type="submit"
            disabled={registerMutation.isPending}
            className="w-full rounded-lg bg-[#0A3D39] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0A3D39]/90 disabled:opacity-50"
          >
            {registerMutation.isPending ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-[#0A3D39] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
