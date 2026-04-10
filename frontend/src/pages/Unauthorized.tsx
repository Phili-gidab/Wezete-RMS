import { useNavigate } from 'react-router-dom';
import { ShieldX } from 'lucide-react';

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <ShieldX size={64} className="mx-auto mb-4 text-red-400" strokeWidth={1.5} />
        <h1 className="text-2xl font-semibold text-forest">Access Denied</h1>
        <p className="mt-2 text-slate-500">
          You do not have permission to view this page.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-6 rounded-lg bg-forest px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-forest-light"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
