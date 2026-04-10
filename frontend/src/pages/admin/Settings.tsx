import { useProfile } from '../../api/hooks';

export default function Settings() {
  const { data: profile, isLoading } = useProfile();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#0A3D39] mb-6">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Restaurant Info */}
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Restaurant Information</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Restaurant Name</label>
              <input
                type="text"
                defaultValue="The Bar Addis Restaurant & Lounge"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A3D39] focus:outline-none focus:ring-1 focus:ring-[#0A3D39]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Phone</label>
              <input
                type="tel"
                defaultValue="+251911073316"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A3D39] focus:outline-none focus:ring-1 focus:ring-[#0A3D39]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Address</label>
              <input
                type="text"
                defaultValue="Addis Ababa, Ethiopia"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A3D39] focus:outline-none focus:ring-1 focus:ring-[#0A3D39]"
              />
            </div>
            <button className="rounded-lg bg-[#0A3D39] px-4 py-2 text-sm font-medium text-white hover:bg-[#0A3D39]/90">
              Save Changes
            </button>
          </div>
        </div>

        {/* Account Info */}
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Your Account</h2>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : profile ? (
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
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A3D39] focus:outline-none focus:ring-1 focus:ring-[#0A3D39]"
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
                defaultValue={15}
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
                defaultValue="WZ"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A3D39] focus:outline-none focus:ring-1 focus:ring-[#0A3D39]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Currency</label>
              <input
                type="text"
                defaultValue="ETB"
                disabled
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
              />
            </div>
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
              <div className="h-5 w-9 rounded-full bg-green-500 relative">
                <div className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-white" />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-700">Chapa Payments</p>
                <p className="text-xs text-slate-500">Telebirr, CBE Birr, Awash Bank</p>
              </div>
              <div className="h-5 w-9 rounded-full bg-green-500 relative">
                <div className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-white" />
              </div>
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
              <p className="text-xs text-blue-700">
                Chapa API integration is active. Webhook URL and secret key are configured on the server.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
