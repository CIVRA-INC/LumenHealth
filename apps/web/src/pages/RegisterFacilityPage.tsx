import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function RegisterFacilityPage() {
  const [facilityName, setFacilityName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Connect to backend
    setTimeout(() => {
      setLoading(false);
      navigate('/onboarding/staff');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-400/20 blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-teal-400/20 blur-[100px]" />

      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl rounded-3xl p-8 relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg flex items-center justify-center mb-6">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">First Facility</h1>
          <p className="text-slate-500 mt-2 text-center">Let's set up your primary clinic or hospital location.</p>
        </div>

        <form onSubmit={handleCreate} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Facility Name</label>
            <Input 
              placeholder="e.g. Downtown Clinic" 
              value={facilityName}
              onChange={(e) => setFacilityName(e.target.value)}
              required
            />
          </div>

          <Button type="submit" size="lg" className="w-full mt-4" disabled={loading} style={{ backgroundColor: '#10b981' }}>
            {loading ? 'Creating...' : 'Create Facility'}
          </Button>
        </form>
      </div>
    </div>
  );
}
