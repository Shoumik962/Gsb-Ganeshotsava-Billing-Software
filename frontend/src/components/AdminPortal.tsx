import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import type { Seva } from '../data/sevas';

type AdminSeva=Seva&{active:boolean};
type Settings={announcement:string;hero_title:string;booking_enabled:boolean;donations_enabled:boolean;contact_phone:string};
type Summary={registered_users:number;active_sevas:number;total_bookings:number;demo_bookings:number;verified_receipts:number};
type AdminUser={id:string;username:string;role:string;email?:string;full_name?:string;active:boolean;email_verified:boolean};
type Audit={id:string;actor_id:string;action:string;resource_type:string;resource_id:string;created_at:string};
type Booking={id:string;name:string;phone:string;items:{name:string}[];amount:number;status:string;gateway_mode:string;receipt_no?:string};
const defaults={id:'',name:'',price:101,category:'offerings',timing:'',note:'',exceptEkadashi:false,active:true};
const emptySite:Settings={announcement:'',hero_title:'',booking_enabled:true,donations_enabled:true,contact_phone:''};
const field='field-input w-full';
const categories=[{value:'major',label:'Major Sevas'},{value:'pooja-naivedya',label:'Pooja & Naivedya'},{value:'offerings',label:'Offerings'}];
export default function AdminPortal() {
  const [token,setToken]=useState(()=>sessionStorage.getItem('ganesh_staff_token')||'');
  const [role,setRole]=useState(()=>sessionStorage.getItem('ganesh_staff_role')||'');
  const [username,setUsername]=useState('');const [password,setPassword]=useState('');
  const [error,setError]=useState('');const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);
  const [tab,setTab]=useState<'sevas'|'website'|'users'|'bookings'|'audit'>('sevas');
  const [sevas,setSevas]=useState<AdminSeva[]>([]);const [form,setForm]=useState({...defaults});const [editing,setEditing]=useState(false);
  const [site,setSite]=useState<Settings>(emptySite);
  const [summary,setSummary]=useState<Summary|null>(null);
  const [users,setUsers]=useState<AdminUser[]>([]);const [bookings,setBookings]=useState<Booking[]>([]);const [audits,setAudits]=useState<Audit[]>([]);
  const [staffForm,setStaffForm]=useState({username:'',password:'',role:'sevadar',zone:''});
  const call=useCallback(<T,>(path:string,method='GET',data?:unknown):Promise<T>=>apiRequest<T>(path,{method,...(data!==undefined?{body:JSON.stringify(data)}:{})},token),[token]);
  const refresh=useCallback(async()=>{
    if (!token || !['super_admin','admin'].includes(role)) return;
    try {const [a,b,c,d,e,f]=await Promise.all([call<AdminSeva[]>('/api/admin/sevas'),call<Settings>('/api/site/settings'),call<Summary>('/api/admin/dashboard'),call<AdminUser[]>('/api/admin/users'),call<Booking[]>('/api/admin/bookings'),call<Audit[]>('/api/admin/audit')]);setSevas(a);setSite(b);setSummary(c);setUsers(d);setBookings(e);setAudits(f);}
    catch(e){setError(e instanceof Error?e.message:'Unable to load admin data');}
  },[token,role,call]);
  useEffect(()=>{void refresh();},[refresh]);
  async function doAction(work:()=>Promise<unknown>,success:string,refreshCatalog=false){
    setBusy(true);setError('');setNotice('');try{await work();setNotice(success);await refresh();if(refreshCatalog)window.dispatchEvent(new Event('ganesh:sevas-updated'));}
    catch(e){setError(e instanceof Error?e.message:'Admin update failed');}finally{setBusy(false);}
  }
  async function login(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{
    const result=await apiRequest<{access_token:string;role:string}>('/api/auth/login',{method:'POST',body:JSON.stringify({username,password})});
    if(!['super_admin','admin'].includes(result.role))throw new Error('Admin permissions required');
    sessionStorage.setItem('ganesh_staff_token',result.access_token);sessionStorage.setItem('ganesh_staff_role',result.role);
    setToken(result.access_token);setRole(result.role);setPassword('');
  }catch(e){setError(e instanceof Error?e.message:'Sign in failed');}finally{setBusy(false);}}
  const logout=()=>{sessionStorage.removeItem('ganesh_staff_token');sessionStorage.removeItem('ganesh_staff_role');setToken('');setRole('');};
  const saveSeva=async(e:React.FormEvent)=>{e.preventDefault();const body={...form,id:form.id||undefined,price:Number(form.price)};
    await doAction(()=>call(editing?`/api/admin/sevas/${form.id}`:'/api/admin/sevas',editing?'PATCH':'POST',editing?{name:body.name,price:body.price,category:body.category,timing:body.timing||null,note:body.note||null,exceptEkadashi:body.exceptEkadashi,active:body.active}:body),editing?'Seva updated':'Seva created',true);
    setEditing(false);setForm({...defaults});
  };
  function editSeva(s:AdminSeva){setForm({id:s.id,name:s.name,price:s.price,category:s.category,timing:s.timing||'',note:s.note||'',exceptEkadashi:!!s.exceptEkadashi,active:s.active});setEditing(true);window.scrollTo({top:0,behavior:'smooth'});}
  if(!token||!['super_admin','admin'].includes(role))return <div className="mx-auto max-w-lg card p-7 space-y-5"><h1 className="text-3xl font-display font-bold">Admin Portal</h1><p className="text-sm">Only an administrator can change sevas, website content and staff access. Public users cannot grant themselves an admin role.</p>{error&&<p role="alert" className="bg-red-50 p-3 text-red-800">{error}</p>}<form onSubmit={login} className="space-y-3"><label className="block text-sm">Admin username<input className={field} required value={username} onChange={e=>setUsername(e.target.value)}/></label><label className="block text-sm">Password<input className={field} type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button disabled={busy} className="btn-primary w-full">Sign in as admin</button></form></div>;
  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="rounded-2xl bg-cream-100 p-6"><div className="flex flex-wrap justify-between gap-3"><div><h1 className="font-display text-3xl font-bold">Website Administration</h1><p className="mt-1 text-sm">Manage the live PostgreSQL seva catalogue, website settings, accounts and booking activity.</p></div><button className="btn-secondary" onClick={logout}>Sign out</button></div></div>
    {summary&&<div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{Object.entries(summary).map(([k,v])=><div key={k} className="card p-3 text-center"><p className="text-2xl font-black">{v}</p><p className="text-xs capitalize">{k.replaceAll('_',' ')}</p></div>)}</div>}
    <div className="flex flex-wrap gap-2">{(['sevas','website','users','bookings','audit'] as const).map(t=><button key={t} className={tab===t?'btn-primary':'btn-secondary'} onClick={()=>setTab(t)}>{t==='sevas'?'Manage Sevas':t==='website'?'Website Controls':t==='users'?'Users & Staff':t==='bookings'?'Bookings & Receipts':'Audit History'}</button>)}</div>
    {error&&<p className="rounded-lg bg-red-50 p-3 text-red-900" role="alert">{error}</p>}{notice&&<p className="rounded-lg bg-green-50 p-3 text-green-900" role="status">{notice}</p>}
    {tab==='sevas'&&<div className="grid gap-5 lg:grid-cols-[minmax(290px,1fr)_2fr]">
      <form onSubmit={saveSeva} className="card space-y-3 p-5"><h2 className="text-xl font-bold">{editing?'Edit Seva':'Add New Seva'}</h2>
        <label className="block text-sm font-semibold">Stable Seva ID (optional for new)<input className={field} placeholder="Auto-generated from name" value={form.id} disabled={editing} onChange={e=>setForm({...form,id:e.target.value})}/></label>
        <label className="block text-sm font-semibold">Seva Name<input className={field} required minLength={3} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
        <label className="block text-sm font-semibold">Price (₹)<input className={field} type="number" required min={1} max={2000000} value={form.price} onChange={e=>setForm({...form,price:Number(e.target.value)})}/></label>
        <label className="block text-sm font-semibold">Category<select className={field} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
        <label className="block text-sm font-semibold">Timing<input className={field} value={form.timing} onChange={e=>setForm({...form,timing:e.target.value})}/></label>
        <label className="block text-sm font-semibold">Notes<input className={field} value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={form.exceptEkadashi} onChange={e=>setForm({...form,exceptEkadashi:e.target.checked})}/> Except Ekadashi</label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Available for bookings</label>
        <button className="btn-primary w-full" disabled={busy}>{editing?'Save Changes':'Create Seva'}</button>{editing&&<button className="btn-secondary w-full" type="button" onClick={()=>{setEditing(false);setForm({...defaults});}}>Cancel edit</button>}
        <p className="text-xs">Try: <strong>TEST ONLY - Ganesh Archana</strong>, ₹101, Offerings. The original 27 sevas can be imported by a backend command.</p>
      </form>
      <div className="card overflow-x-auto p-5"><h2 className="mb-3 text-xl font-bold">All Sevas ({sevas.length})</h2><table className="w-full text-left text-sm"><thead><tr><th>Name</th><th>Price</th><th>Available</th><th>Action</th></tr></thead><tbody>{sevas.map(s=><tr className="border-t" key={s.id}><td className="py-2 pr-3"><strong>{s.name}</strong><p className="text-xs">{s.id}</p></td><td>₹{s.price.toLocaleString('en-IN')}</td><td>{s.active?'Yes':'Disabled'}</td><td><button className="text-maroon-800 underline" onClick={()=>editSeva(s)}>Edit</button></td></tr>)}</tbody></table>{!sevas.length&&<p>No sevas yet. Create a dummy above or import the original catalogue.</p>}</div>
    </div>}
    {tab==='website'&&<form onSubmit={e=>{e.preventDefault();void doAction(()=>call('/api/admin/site/settings','PATCH',site),'Website settings saved');}} className="card max-w-2xl space-y-4 p-6"><h2 className="text-xl font-bold">Website settings</h2>
      <label className="block text-sm font-semibold">Public announcement<input className={field} value={site.announcement} maxLength={250} onChange={e=>setSite({...site,announcement:e.target.value})}/></label>
      <label className="block text-sm font-semibold">Homepage headline<input className={field} value={site.hero_title} maxLength={150} onChange={e=>setSite({...site,hero_title:e.target.value})}/></label>
      <label className="block text-sm font-semibold">Contact phone<input className={field} value={site.contact_phone} maxLength={30} onChange={e=>setSite({...site,contact_phone:e.target.value})}/></label>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={site.booking_enabled} onChange={e=>setSite({...site,booking_enabled:e.target.checked})}/> Enable public seva bookings</label>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={site.donations_enabled} onChange={e=>setSite({...site,donations_enabled:e.target.checked})}/> Enable donations</label>
      <button disabled={busy} className="btn-primary">Save website settings</button><p className="text-xs">These settings cover the homepage notice, headline, contact details and booking switches. Full page/layout CMS and media uploads are not implemented yet.</p></form>}
    {tab==='users'&&<div className="space-y-5"><div className="card overflow-auto p-5"><h2 className="mb-3 text-xl font-bold">Registered users ({users.length})</h2><table className="w-full text-left text-sm"><thead><tr><th>Username</th><th>Role</th><th>Email</th><th>Status</th><th>Action</th></tr></thead><tbody>{users.map(u=><tr key={u.id} className="border-t"><td className="py-2">{u.username}</td><td>{u.role}</td><td>{u.email||'—'}</td><td>{u.active?'Active':'Inactive'}</td><td>{role==='super_admin'&&u.role!=='super_admin'&&<button className="underline" disabled={busy} onClick={()=>void doAction(()=>call(`/api/admin/users/${u.id}/status`,'PATCH',{active:!u.active}),'User status updated')}>{u.active?'Deactivate':'Activate'}</button>}</td></tr>)}</tbody></table></div>
      {role==='super_admin'&&<form className="card max-w-xl space-y-3 p-5" onSubmit={e=>{e.preventDefault();void doAction(()=>call('/api/admin/users','POST',staffForm),'Staff user created');}}><h2 className="text-xl font-bold">Create Admin / Sevadar</h2><label className="block">Username<input className={field} required value={staffForm.username} onChange={e=>setStaffForm({...staffForm,username:e.target.value})}/></label><label className="block">Password (12+ characters)<input className={field} type="password" minLength={12} required value={staffForm.password} onChange={e=>setStaffForm({...staffForm,password:e.target.value})}/></label><label className="block">Role<select className={field} value={staffForm.role} onChange={e=>setStaffForm({...staffForm,role:e.target.value})}><option value="sevadar">Sevadar</option><option value="admin">Admin</option></select></label><label className="block">Sevadar zone<input className={field} value={staffForm.zone} onChange={e=>setStaffForm({...staffForm,zone:e.target.value})}/></label><button disabled={busy} className="btn-primary">Create staff user</button></form>}
    </div>}
    {tab==='audit'&&<div className="card overflow-auto p-5"><h2 className="mb-4 text-xl font-bold">Administrative change history</h2><table className="w-full text-left text-sm"><thead><tr><th>Action</th><th>Resource</th><th>Time</th></tr></thead><tbody>{audits.map(a=><tr key={a.id} className="border-t"><td className="py-2">{a.action}</td><td>{a.resource_type}: {a.resource_id}</td><td>{new Date(a.created_at).toLocaleString('en-IN')}</td></tr>)}</tbody></table>{!audits.length&&<p>No changes recorded yet.</p>}</div>}
    {tab==='bookings'&&<div className="card overflow-auto p-5"><h2 className="mb-4 text-xl font-bold">Seva bookings and receipts ({bookings.length})</h2><table className="w-full text-left text-sm"><thead><tr><th>Devotee</th><th>Seva</th><th>Amount</th><th>Status</th><th>Receipt</th></tr></thead><tbody>{bookings.map(b=><tr className="border-t" key={b.id}><td className="py-2">{b.name}<p className="text-xs">{b.phone}</p></td><td>{b.items.map(x=>x.name).join(', ')}</td><td>₹{b.amount.toLocaleString('en-IN')}</td><td>{b.status} ({b.gateway_mode})</td><td className="break-all">{b.receipt_no||'Pending payment'}</td></tr>)}</tbody></table>{!bookings.length&&<p>No bookings yet.</p>}</div>}
  </div>;
}
