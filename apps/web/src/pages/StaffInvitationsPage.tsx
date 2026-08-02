import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Users, Mail, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StaffInvitationsPage() {
  const [email, setEmail] = useState('');
  const [invites, setInvites] = useState<{email: string, role: string}[]>([]);
  const navigate = useNavigate();

  const handleAddInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && !invites.find(i => i.email === email)) {
      setInvites([...invites, { email, role: 'clinician' }]);
      setEmail('');
    }
  };

  const handleFinish = () => {
    // Navigate to dashboard
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-400/20 blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-fuchsia-400/20 blur-[100px]" />

      <div className="w-full max-w-lg bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl rounded-3xl p-8 relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-2xl shadow-lg flex items-center justify-center mb-6">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Invite Staff</h1>
          <p className="text-slate-500 mt-2 text-center">Add your team members to start collaborating.</p>
        </div>

        <form onSubmit={handleAddInvite} className="flex gap-3 mb-6">
          <Input 
            type="email"
            placeholder="colleague@clinic.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="outline" className="shrink-0">
            Add
          </Button>
        </form>

        {invites.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-6 divide-y divide-slate-100">
            {invites.map((invite, i) => (
              <div key={i} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{invite.email}</p>
                    <p className="text-xs text-slate-500 capitalize">{invite.role}</p>
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
            ))}
          </div>
        )}

        <Button onClick={handleFinish} size="lg" className="w-full" style={{ backgroundColor: '#8b5cf6' }}>
          {invites.length > 0 ? 'Send Invites & Finish' : 'Skip for now'}
        </Button>
      </div>
    </div>
  );
}
