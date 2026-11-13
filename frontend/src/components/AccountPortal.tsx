import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

type Account = { id:string;username:string;role:string;full_name?:string;email?:string;phone?:string;devotee_code?:string;email_verified:boolean };
type Booking = { id:string;items:{name:string;price:number}[];amount:number;status:string;receipt_no?:string;preferred_date?:string;created_at:string };
const input = 'field-input w-full';

export default function AccountPortal() {
  const [token,setToken]=useState(()=>sessionStorage.getItem('ganesh_devotee_token')||'');
  const [profile,setProfile]=useState<Account|null>(null);
  const [bookings,setBookings]=useState<Booking[]>([]);
  const [mode,setMode]=useState<'login'|'signup'>('signup');
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [email,setEmail]=useState('');
  const [fullName,setFullName]=useState('');
  const [phone,setPhone]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  useEffect(()=>{
    if (!token) {setProfile(null);setBookings([]);return;}
    let active=true;
    Promise.all([apiRequest<Account>('/api/account/me',{},token),apiRequest<Booking[]>('/api/account/bookings',{},token)])
      .then(([account,orders])=>{if(active){setProfile(account);setBookings(orders);}})
      .catch((e)=>{if(active){setError(e instanceof Error?e.message:'Session expired');sessionStorage.removeItem('ganesh_devotee_token');setToken('');}});
    return ()=>{active=false;};
  },[token]);
  async function submit(event:React.FormEvent) {
    event.preventDefault();setBusy(true);setError('');setNotice('');
    try {
      if (mode==='signup') {
        const result=await apiRequest<{devotee_code:string;duplicate_review_required:boolean}>('/api/auth/register',{method:'POST',body:JSON.stringify({username,password,email,full_name:fullName,phone})});
        setNotice(`Account created: ${result.devotee_code}. ${result.duplicate_review_required?'Possible duplicate sent for staff review.':''}`);
      }
      const login=await apiRequest<{access_token:string;role:string}>('/api/auth/login',{method:'POST',body:JSON.stringify({username,password})});
      if(login.role!=='devotee') throw new Error('Staff accounts belong in Staff Operations / Admin Portal.');
      sessionStorage.setItem('ganesh_devotee_token',login.access_token);
      setToken(login.access_token);setPassword('');
    } catch(e) {setError(e instanceof Error?e.message:'Sign in failed');}
    finally {setBusy(false);}
  }
  const logout=()=>{sessionStorage.removeItem('ganesh_devotee_token');setToken('');setProfile(null);setNotice('Signed out.');};
  return <div className="mx-auto max-w-4xl space-y-6">
    <div className="rounded-2xl bg-cream-100 p-6">
      <h1 className="font-display text-3xl font-bold text-maroon-950">My Devotee Account</h1>
      <p className="mt-2 text-sm text-maroon-800">Register once to receive a unique Devotee ID, sign in and book sevas. Family links are reviewed separately to avoid false duplicate merges.</p>
    </div>
    {error&&<p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-900">{error}</p>}
    {notice&&<p role="status" className="rounded-lg bg-green-50 p-3 text-green-900">{notice}</p>}
    {token&&profile ? <div className="space-y-5">
      <div className="card space-y-3 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl font-bold">Welcome, {profile.full_name||profile.username}</h2><p className="text-sm">Devotee ID: <strong>{profile.devotee_code||'Pending linkage'}</strong></p></div><button className="btn-secondary" onClick={logout}>Sign out</button></div>
        <p className="text-sm">Email: {profile.email||'Not provided'} · Phone: {profile.phone||'Not provided'}</p>
        {!profile.email_verified&&<p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Development account: email verification/OTP is not enabled yet. Do not deploy public registration until verification, rate limiting and password recovery are configured.</p>}
        <button className="btn-primary" onClick={()=>{window.location.hash='#sevas';}}>Browse & book sevas</button>
      </div>
      <div className="card p-6"><h2 className="text-xl font-bold">My booking history ({bookings.length})</h2>
        {!bookings.length&&<p className="mt-3 text-sm">No bookings yet. A demo seva booking will appear here after checkout.</p>}
        <div className="mt-3 space-y-3">{bookings.map(b=><div key={b.id} className="rounded-lg border p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{b.items.map(x=>x.name).join(', ')||'Seva booking'}</strong><span>₹{b.amount.toLocaleString('en-IN')}</span></div><p>Status: <strong>{b.status}</strong> · {new Date(b.created_at).toLocaleString('en-IN')}</p>{b.receipt_no&&<p className="font-semibold">Receipt: {b.receipt_no}{b.receipt_no.startsWith('DEMO-')?' (NOT VALID)':''}</p>}</div>)}</div>
      </div>
    </div> : <div className="card mx-auto max-w-xl p-6">
      <div className="mb-5 flex gap-2"><button className={mode==='signup'?'btn-primary':'btn-secondary'} onClick={()=>setMode('signup')}>Create account</button><button className={mode==='login'?'btn-primary':'btn-secondary'} onClick={()=>setMode('login')}>Sign in</button></div>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-semibold">Username<input className={input} autoComplete="username" required minLength={3} value={username} onChange={e=>setUsername(e.target.value)}/></label>
        {mode==='signup'&&<><label className="block text-sm font-semibold">Full name<input className={input} autoComplete="name" required minLength={3} value={fullName} onChange={e=>setFullName(e.target.value)}/></label>
          <label className="block text-sm font-semibold">Email<input className={input} type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
          <label className="block text-sm font-semibold">Mobile number<input className={input} type="tel" autoComplete="tel" required value={phone} onChange={e=>setPhone(e.target.value)}/></label></>}
        <label className="block text-sm font-semibold">Password (minimum 12 characters)<input className={input} type="password" autoComplete={mode==='signup'?'new-password':'current-password'} required minLength={12} value={password} onChange={e=>setPassword(e.target.value)}/></label>
        <button className="btn-primary w-full" disabled={busy}>{busy?'Please wait…':mode==='signup'?'Create devotee account':'Sign in'}</button>
      </form>
    </div>}
  </div>;
}
