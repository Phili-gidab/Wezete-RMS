import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useProfile, useSettings, useUpdateSettings } from '../../api/hooks';

export default function Settings() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateSettings.mutate(form, {
      onSuccess: () => toast.success('Settings saved'),
      onError: () => toast.error('Failed to save settings'),
    });
  };

  const isLoading = profileLoading || settingsLoading;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#0A3D39] mb-6">Settings</h1>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Restaurant Info */}
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Restaurant Information</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Restaurant Name</label>
                <input
                  type="text"
                  value={form.restaurantName ?? ''}
                  onChange={(e) => handleChange('restaurantName', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A3D39] focus:outline-none focus:ring-1 focus:ring-[#0A3D39]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.restaurantPhone ?? ''}
                  onChange={(e) => handleChange('restaurantPhone', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A3D39] focus:outline-none focus:ring-1 focus:ring-[#0A3D39]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Address</label>
                <input
                  type="text"
                  value={form.restaurantAddress ?? ''}
                  onChange={(e) => handleChange('restaurantAddress', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A3D39] focus:outline-none focus:ring-1 focus:ring-[#0A3D39]"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={updateSettings.isPending}
                className="rounded-lg bg-[#0A3D39] px-4 py-2 text-sm font-medium text-white hover:bg-[#0A3D39]/90 disabled:opacity-50"
              >
                {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Account Info */}
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Your Account</h2>
            {profile ? (
              <div className="space-y-3">
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(profile.firstName + ' ' + profile.lastName)}&background=0A3D39&color=fff&size=64&rounded=true`}
                    alt="avatar"
                    className="h-16 w-16 rounded-full"
                  />
                  <div>
                    <p className="font-semibold text-slate-800">{profile.firstName} {profile.lastName}</p>
                    <p className="text-sm text-slate-500">{profile.role}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
                  <input
                    type="email"
                    defaultValue={profile.email}
                    disabled
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Phone</label>
                  <input
                    type="tel"
                    defaultValue={profile.phone || ''}
                    disabled
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                  />
                </div>
                <p className="text-xs text-slate-400">
                  Member since {new Date(profile.createdAt).toLocaleDateString()}
                </p>
              </div>
            ) : null}
          </div>

          {/* System Config */}
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">System Configuration</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Tax Rate (%)</label>
                <input
                  type="number"
                  value={form.taxRate ?? '15'}
                  onChange={(e) => handleChange('taxRate', e.target.value)}
                  min={0}
                  max={100}
                  step={0.5}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A3D39] focus:outline-none focus:ring-1 focus:ring-[#0A3D39]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Order Number Prefix</label>
                <input
                  type="text"
                  value={form.orderPrefix ?? 'WZ'}
                  onChange={(e) => handleChange('orderPrefix', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A3D39] focus:outline-none focus:ring-1 focus:ring-[#0A3D39]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Large Order Threshold (ETB)</label>
                <input
                  type="number"
                  value={form.largeOrderThreshold ?? '5000'}
                  onChange={(e) => handleChange('largeOrderThreshold', e.target.value)}
                  min={0}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A3D39] focus:outline-none focus:ring-1 focus:ring-[#0A3D39]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Currency</label>
                <input
                  type="text"
                  value={form.currency ?? 'ETB'}
                  disabled
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={updateSettings.isPending}
                className="rounded-lg bg-[#0A3D39] px-4 py-2 text-sm font-medium text-white hover:bg-[#0A3D39]/90 disabled:opacity-50"
              >
                {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Payment Config */}
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Payment Configuration</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">Cash Payments</p>
                  <p className="text-xs text-slate-500">Accept cash at POS</p>
                </div>
                <button
                  onClick={() => handleChange('cashEnabled', form.cashEnabled === 'true' ? 'false' : 'true')}
                  className={`h-5 w-9 rounded-full relative transition-colors ${form.cashEnabled === 'true' ? 'bg-green-500' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${form.cashEnabled === 'true' ? 'right-0.5' : 'left-0.5'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">Chapa Payments</p>
                  <p className="text-xs text-slate-500">Telebirr, CBE Birr, Awash Bank</p>
                </div>
                <button
                  onClick={() => handleChange('chapaEnabled', form.chapaEnabled === 'true' ? 'false' : 'true')}
                  className={`h-5 w-9 rounded-full relative transition-colors ${form.chapaEnabled === 'true' ? 'bg-green-500' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${form.chapaEnabled === 'true' ? 'right-0.5' : 'left-0.5'}`} />
                </button>
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
                <p className="text-xs text-blue-700">
                  Chapa API integration is active. Webhook URL and secret key are configured on the server.
                </p>
              </div>
              <button
                onClick={handleSave}
                disabled={updateSettings.isPending}
                className="rounded-lg bg-[#0A3D39] px-4 py-2 text-sm font-medium text-white hover:bg-[#0A3D39]/90 disabled:opacity-50"
              >
                {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
