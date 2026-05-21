import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { useLogin } from '../api/hooks';
import type { RoleId } from '../stores/useAuthStore';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const loginMutation = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const data = await loginMutation.mutateAsync({ email, password });
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
      setError(err.response?.data?.message || 'Login failed. Please try again.');
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

        <h2 className="text-xl font-semibold text-slate-800 mb-1">Welcome back</h2>
        <p className="text-sm text-slate-500 mb-6">Sign in to your account</p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A3D39] focus:outline-none focus:ring-1 focus:ring-[#0A3D39]"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A3D39] focus:outline-none focus:ring-1 focus:ring-[#0A3D39]"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full rounded-lg bg-[#0A3D39] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0A3D39]/90 disabled:opacity-50"
          >
            {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Don't have an account?{' '}
          <Link to="/register" className="text-[#0A3D39] font-medium hover:underline">
            Register
          </Link>
        </p>

        {import.meta.env.DEV && (
          <Link
            to="/dev-login"
            className="mt-3 block text-center text-xs text-slate-400 hover:text-slate-600"
          >
            Dev Login (role picker)
          </Link>
        )}
      </div>
    </div>
  );
}
