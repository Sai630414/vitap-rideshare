import React, { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import {
  Settings,
  RefreshCw,
  Save,
  AlertTriangle,
  Mail,
  Phone,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import adminService from '../../services/adminService';

export const AdminSettings: React.FC = () => {
  const { toast } = useToast();

  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);

  // Separate states for easy editing
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
  const [driverVerificationRequired, setDriverVerificationRequired] = useState<boolean>(true);
  const [emergencyContact, setEmergencyContact] = useState<string>('');
  const [supportEmail, setSupportEmail] = useState<string>('');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await adminService.getSettings();
      if (res.status === 'success') {
        const data = res.data.settings || [];
        setSettings(data);

        // Map settings to state
        const maintenance = data.find((s: any) => s.key === 'maintenanceMode');
        const driverVerification = data.find((s: any) => s.key === 'driverVerificationRequired');
        const emergency = data.find((s: any) => s.key === 'emergencyContact');
        const support = data.find((s: any) => s.key === 'supportEmail');

        if (maintenance) setMaintenanceMode(!!maintenance.value);
        if (driverVerification) setDriverVerificationRequired(!!driverVerification.value);
        if (emergency) setEmergencyContact(String(emergency.value));
        if (support) setSupportEmail(String(support.value));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load system settings configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const payload = [
        { key: 'maintenanceMode', value: maintenanceMode },
        { key: 'driverVerificationRequired', value: driverVerificationRequired },
        { key: 'emergencyContact', value: emergencyContact },
        { key: 'supportEmail', value: supportEmail },
      ];

      const res = await adminService.updateSettings(payload);
      if (res.status === 'success') {
        toast.success('System settings updated successfully.');
        // Refresh local items
        setSettings(res.data.settings);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update system settings.');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-slate-400 font-sans">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-500 animate-pulse">
          Retrieving settings...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-slate-100 font-sans animate-fade-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2.5">
            <Settings className="w-8 h-8 text-emerald-400" />
            System Configurations
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-bold tracking-wide uppercase">
            Adjust security preferences, hotline configurations, and operational switches
          </p>
        </div>
        <Button
          onClick={fetchSettings}
          className="text-xs py-2 h-auto bg-slate-900 border border-slate-800 hover:border-emerald-950 text-emerald-455 font-bold uppercase tracking-wider rounded-xl cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSave}>
          <Card className="bg-slate-900/60 border-slate-800/80">
            <CardHeader className="border-b border-slate-855 pb-4">
              <CardTitle className="text-sm font-bold text-slate-200">Site-wide Settings Panel</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col gap-6 text-xs">
              {/* Toggle: Maintenance Mode */}
              <div className="flex items-center justify-between p-4 bg-slate-950/40 border border-slate-855 rounded-2xl">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-extrabold text-slate-200">Maintenance Mode Switch</h3>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                      Locks public access for students and drivers. Replaces site content with a maintenance screen.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMaintenanceMode(!maintenanceMode)}
                  className="text-emerald-400 hover:text-emerald-350 transition-all shrink-0 cursor-pointer"
                >
                  {maintenanceMode ? (
                    <ToggleRight className="w-10 h-10 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-slate-600" />
                  )}
                </button>
              </div>

              {/* Toggle: Driver Verification Required */}
              <div className="flex items-center justify-between p-4 bg-slate-950/40 border border-slate-855 rounded-2xl">
                <div className="flex gap-3">
                  <Save className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-extrabold text-slate-200">Enforce Driver Verifications</h3>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                      When enabled, drivers cannot post rides or accept bookings until an administrator verifies documents.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDriverVerificationRequired(!driverVerificationRequired)}
                  className="text-emerald-400 hover:text-emerald-350 transition-all shrink-0 cursor-pointer"
                >
                  {driverVerificationRequired ? (
                    <ToggleRight className="w-10 h-10 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-slate-600" />
                  )}
                </button>
              </div>

              {/* Input: Emergency hotline */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  Emergency Security Hotline (SOS Target)
                </label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-emerald-650 font-semibold"
                  placeholder="e.g. 0863-2370000"
                  required
                />
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                  The primary campus security phone contact broadcasted on SOS requests.
                </p>
              </div>

              {/* Input: Support Email */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-400" />
                  System Support Email
                </label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-emerald-650 font-semibold"
                  placeholder="e.g. support@vitapstudent.ac.in"
                  required
                />
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                  Contact email address featured in system emails and footer help links.
                </p>
              </div>

              {/* Save Controls */}
              <div className="border-t border-slate-850 pt-5 flex justify-end">
                <Button
                  type="submit"
                  className="bg-emerald-650 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider text-xs px-6 py-3 rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/20"
                  loading={saveLoading}
                >
                  <Save className="w-4 h-4" />
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default AdminSettings;
