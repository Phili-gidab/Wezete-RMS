import { useNavigate } from 'react-router-dom';
import { useAuthStore, type RoleId } from '../stores/useAuthStore';
import { ROLE_LABELS } from '../constants/roles';

/**
 * Temporary dev-only login page.
 * Pick a role to simulate logging in — no backend required.
 * Remove this page before production.
 */
const ROLES: RoleId[] = [8, 7, 6, 5, 4, 3, 2, 1];

export default function DevLogin() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleLogin = (roleId: RoleId) => {
    login({
      accessToken: 'dev-token',
      user: {
        id: `dev-${roleId}`,
        email: `${ROLE_LABELS[roleId].toLowerCase().replace(/ /g, '.')}@wezete.dev`,
        name: `Dev ${ROLE_LABELS[roleId]}`,
        roleId,
      },
    });
    navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-6">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-forest text-white text-sm font-bold">
            W
          </span>
          <span className="text-lg font-semibold text-forest">Wezete RMS</span>
        </div>

        <p className="text-sm text-slate-500 mb-4">
          Dev login — pick a role to enter the app:
        </p>

        <div className="space-y-2">
          {ROLES.map((roleId) => (
            <button
              key={roleId}
              onClick={() => handleLogin(roleId)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5 text-sm transition-colors hover:bg-brand hover:text-forest"
            >
              <span className="font-medium text-forest">{ROLE_LABELS[roleId]}</span>
              <span className="text-xs text-slate-400">Level {roleId}</span>
            </button>
          ))}
        </div>

        <p className="mt-4 text-xs text-slate-400 text-center">
          Remove this page before production
        </p>
      </div>
    </div>
  );
}
