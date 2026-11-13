import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import NearbyMap from './NearbyMap';

type Devotee = { id: string; devotee_code: string; first_name: string; last_name: string; phone?: string; email?: string; potential_duplicate_count?: number };
type Family = { id: string; family_code: string; name: string; visit_consent: boolean; members: { devotee_id: string; relationship: string }[]; addresses: { address_id: string }[] };
type Address = { id: string; unit: string; building: string; locality: string; city: string; pincode: string; verified: boolean; latitude?: number; longitude?: number; reused?: boolean };
type Candidate = { id: string; score: number; reasons: string[]; devotee_a: Devotee; devotee_b: Devotee };
type Nearby = { family_id: string; family_code: string; family_name: string; address_id: string; address: string; latitude: number; longitude: number; distance_km: number };
type Assignment = { id: string; family_id: string; address_id: string; status: string; purpose: string; distance_km: number };
type TokenResult = { access_token: string; role: string; username: string };
const emptyAddress = { unit:'',building:'',street:'',locality:'',city:'Mumbai',state:'Maharashtra',pincode:'' };
const inputClass = 'field-input w-full';

export default function OperationsPortal() {
  const [token, setToken] = useState(() => sessionStorage.getItem('ganesh_staff_token') || '');
  const [role, setRole] = useState(() => sessionStorage.getItem('ganesh_staff_role') || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState<'identity'|'families'|'addresses'|'review'|'visits'>('identity');
  const [devotees, setDevotees] = useState<Devotee[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [person, setPerson] = useState({first_name:'',last_name:'',phone:'',email:''});
  const [family, setFamily] = useState({name:'',head_devotee_id:'',visit_consent:false,visit_consent_source:'in_person',visit_consent_ref:''});
  const [member, setMember] = useState({family_id:'',devotee_id:'',relationship:'member'});
  const [familyLink, setFamilyLink] = useState({family_id:'',address_id:''});
  const [personLink, setPersonLink] = useState({devotee_id:'',address_id:''});
  const [suggestions,setSuggestions] = useState<{family_id:string;family_name:string;family_code:string;score:number;reasons:string[]}[]>([]);
  const [address, setAddress] = useState({...emptyAddress});
  const [verification, setVerification] = useState({address_id:'',latitude:'',longitude:'',accuracy_m:'30',source:'on-site verified'});
  const [reviewNotes, setReviewNotes] = useState<Record<string,string>>({});
  const [nearby, setNearby] = useState<Nearby[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [gpsConsent, setGpsConsent] = useState(false);
  const [gps, setGps] = useState<{lat:number;lon:number}|null>(null);
  const isAdmin = role==='super_admin' || role==='admin';

  const call = useCallback(<T,>(path: string, method='GET', data?: unknown): Promise<T> =>
    apiRequest<T>(path, {method, ...(data ? {body:JSON.stringify(data)} : {})}, token), [token]);
  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      if (isAdmin) {
        const [d,f,a,c] = await Promise.all([
          call<Devotee[]>('/api/devotees'),call<Family[]>('/api/families'),
          call<Address[]>('/api/addresses'),call<Candidate[]>('/api/dedup/candidates'),
        ]);
        setDevotees(d);setFamilies(f);setAddresses(a);setCandidates(c);
      } else {
        setAssignments(await call<Assignment[]>('/api/sevadars/me/assignments'));
      }
    } catch(e) { setError(e instanceof Error ? e.message : 'Failed to refresh'); }
  },[token,isAdmin,call]);
  useEffect(() => { void refresh(); },[refresh]);

  const act = async (action: () => Promise<unknown>, label: string) => {
    setBusy(true);setError('');setNotice('');
    try { await action();setNotice(label);await refresh(); }
    catch(e) { setError(e instanceof Error ? e.message : 'Request failed'); }
    finally { setBusy(false); }
  };
  const login = async (e:React.FormEvent) => {
    e.preventDefault();setError('');setBusy(true);
    try {
      const loginData = await apiRequest<TokenResult>('/api/auth/login',{method:'POST',body:JSON.stringify({username,password})});
      sessionStorage.setItem('ganesh_staff_token',loginData.access_token);
      sessionStorage.setItem('ganesh_staff_role',loginData.role);
      setRole(loginData.role);setToken(loginData.access_token);setPassword('');
      setPanel(loginData.role==='sevadar'?'visits':'identity');
    } catch(e) { setError(e instanceof Error ? e.message : 'Sign in failed'); }
    finally { setBusy(false); }
  };
  const logout=()=> {sessionStorage.removeItem('ganesh_staff_token');sessionStorage.removeItem('ganesh_staff_role');setToken('');setRole('');setNearby([]);setGps(null);};
  const collectLocation = async () => {
    if (!gpsConsent) {setError('Enable the location consent checkbox first');return;}
    if (!navigator.geolocation) {setError('GPS is not available in this browser');return;}
    setBusy(true);setError('');setNotice('');
    try {
      const position = await new Promise<GeolocationPosition>((resolve,reject)=> navigator.geolocation.getCurrentPosition(resolve,reject,
        {enableHighAccuracy:true,timeout:15000,maximumAge:0}));
      if (position.coords.accuracy > 100) throw new Error('GPS accuracy is over 100 m. Move outdoors and retry.');
      await call('/api/sevadars/me/location','POST',{latitude:position.coords.latitude,longitude:position.coords.longitude,
        accuracy_m:position.coords.accuracy,consent:true});
      setGps({lat:position.coords.latitude,lon:position.coords.longitude});
      setNearby(await call<Nearby[]>('/api/sevadars/me/nearby?radius_km=3'));
      setNotice('Nearby consented, verified households refreshed. GPS automatically expires server-side after 15 minutes.');
    } catch(e) {setError(e instanceof Error ? e.message : 'GPS unavailable');}
    finally {setBusy(false);}
  };
  const stopLocation = () => void act(async () => {
    await call('/api/sevadars/me/location','DELETE');setNearby([]);setGps(null);setGpsConsent(false);
  },'Location sharing stopped.');
  const chooseReview = (candidate:Candidate, decision:'merge'|'related'|'reject',survivor?:string) => {
    const reason=(reviewNotes[candidate.id]||'').trim();
    if(reason.length<10) {setError('Enter at least 10 characters explaining the decision');return;}
    if(decision==='merge'&&!window.confirm('Confirm that BOTH profiles are the SAME PERSON? The absorbed ID will be retired and a permanent audit trail created.'))return;
    void act(()=>call(`/api/dedup/candidates/${candidate.id}/decision`,'POST',{
      decision,reason,survivor_devotee_id:survivor||null,confirmed_same_person:decision==='merge',
    }),`Candidate ${decision} reviewed`);
  };
  const tabs: {id:typeof panel,label:string}[] = isAdmin ? [
    {id:'identity',label:'Devotees'}, {id:'families',label:'Family links'}, {id:'addresses',label:'Address master'},
    {id:'review',label:`Duplicate review (${candidates.length})`}, {id:'visits',label:'Sevadar map'},
  ] : [{id:'visits',label:'Sevadar map'}];

  return <div className="mx-auto max-w-6xl space-y-5">
    <div className="rounded-xl bg-cream-100 p-6">
      <h1 className="font-display text-3xl font-bold text-maroon-950">Staff Operations • Identity & Field Visits</h1>
      <p className="mt-2 text-sm text-maroon-800/80">Access-controlled PostgreSQL registry: unique Devotee IDs, family links, verified household addresses, duplicate review and GPS-based sevadar visits.</p>
    </div>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    {!token ? <form onSubmit={login} className="card mx-auto max-w-md space-y-4 p-6">
      <h2 className="font-display text-xl font-bold">Authorized staff sign-in</h2>
      <label className="block field-label">Username<input className={inputClass} value={username} onChange={e=>setUsername(e.target.value)} required/></label>
      <label className="block field-label">Password<input className={inputClass} type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
      <button className="btn-primary w-full" disabled={busy}>Sign in</button>
      <p className="text-xs text-maroon-800/70">An administrator must create staff users on the backend. No default password is shipped.</p>
    </form> : <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">{tabs.map(t=><button key={t.id} className={panel===t.id?'btn-primary':'btn-secondary'} onClick={()=>setPanel(t.id)}>{t.label}</button>)}</div>
        <button className="btn-secondary" onClick={logout}>Sign out ({role})</button>
      </div>
      {panel==='identity' && isAdmin && <section className="grid gap-5 md:grid-cols-2">
        <form className="card space-y-3 p-5" onSubmit={e=>{e.preventDefault();void act(async()=>{
          const newPerson=await call<Devotee>('/api/devotees','POST',person);
          setNotice(`Created ${newPerson.devotee_code}; potential duplicates: ${newPerson.potential_duplicate_count||0}`);
          setPerson({first_name:'',last_name:'',phone:'',email:''});
        },'Devotee created. Review potential duplicates before joining identities.');}}>
          <h2 className="font-display text-xl font-bold">Register individual devotee</h2>
          <p className="text-xs">Each person receives their own permanent Devotee ID—even if they share a phone or home.</p>
          {(['first_name','last_name','phone','email'] as const).map(k=><label key={k} className="block field-label">{k.replace('_',' ')}
            <input className={inputClass} required={k==='first_name'} value={person[k]} onChange={e=>setPerson({...person,[k]:e.target.value})}/></label>)}
          <button className="btn-primary" disabled={busy}>Create Devotee ID</button>
        </form>
        <div className="card max-h-[560px] space-y-2 overflow-auto p-5">
          <h2 className="font-display text-xl font-bold">Devotee registry ({devotees.length})</h2>
          {devotees.map(d=><div key={d.id} className="rounded border p-2 text-sm"><strong>{d.first_name} {d.last_name}</strong>
            <p className="break-all font-mono text-xs">{d.devotee_code}</p><p>{d.phone||'No phone'}</p></div>)}
        </div>
      </section>}
      {panel==='families' && isAdmin && <section className="grid gap-5 md:grid-cols-2">
        <form className="card space-y-3 p-5" onSubmit={e=>{e.preventDefault();void act(async()=>{
          await call('/api/families','POST',{...family,head_devotee_id:family.head_devotee_id||null});setFamily({name:'',head_devotee_id:'',visit_consent:false,visit_consent_source:'in_person',visit_consent_ref:''});
        },'Family created; each member retains an individual Devotee ID.');}}>
          <h2 className="font-display text-xl font-bold">Create family (separate Family ID)</h2>
          <label className="block field-label">Family name<input required className={inputClass} value={family.name} onChange={e=>setFamily({...family,name:e.target.value})}/></label>
          <label className="block field-label">Family head<select className={inputClass} value={family.head_devotee_id} onChange={e=>setFamily({...family,head_devotee_id:e.target.value})}>
            <option value="">No head selected</option>{devotees.map(d=><option key={d.id} value={d.id}>{d.first_name} {d.last_name} ({d.devotee_code.slice(0,12)}…)</option>)}</select></label>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={family.visit_consent} onChange={e=>setFamily({...family,visit_consent:e.target.checked})}/>
            Family has explicitly consented to authorized home visits</label>
          {family.visit_consent && <label className="block field-label">Consent reference (signed form/consent register ID)
            <input required className={inputClass} value={family.visit_consent_ref} onChange={e=>setFamily({...family,visit_consent_ref:e.target.value})} placeholder="Consent proof reference"/>
          </label>}
          <button className="btn-primary" disabled={busy}>Create Family ID</button>
        </form>
        <form className="card space-y-3 p-5" onSubmit={e=>{e.preventDefault();void act(()=>call(`/api/families/${member.family_id}/members`,'POST',member),'Member linked to family.');}}>
          <h2 className="font-display text-xl font-bold">Link person to family</h2>
          <label className="block field-label">Family<select required className={inputClass} value={member.family_id} onChange={e=>setMember({...member,family_id:e.target.value})}>
            <option value="">Choose family</option>{families.map(f=><option key={f.id} value={f.id}>{f.name} • {f.family_code.slice(0,12)}</option>)}</select></label>
          <label className="block field-label">Devotee<select required className={inputClass} value={member.devotee_id} onChange={e=>setMember({...member,devotee_id:e.target.value})}>
            <option value="">Choose devotee</option>{devotees.map(d=><option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>)}</select></label>
          <label className="block field-label">Relationship<input className={inputClass} value={member.relationship} onChange={e=>setMember({...member,relationship:e.target.value})}/></label>
          <button className="btn-primary" disabled={busy}>Link existing devotee</button>
          <div className="max-h-48 space-y-2 overflow-y-auto text-xs">{families.map(f=><div key={f.id} className="rounded border p-2">
            <p>{f.name}: {f.members.length} member(s); visiting {f.visit_consent?'consented':'not consented'}</p>
            {f.visit_consent && <button type="button" className="mt-1 underline" onClick={()=>void act(()=>call(`/api/families/${f.id}/visit-consent`,'POST',{consent:false,source:'withdrawal',evidence_ref:'Staff-recorded family withdrawal'}),'Family visit consent revoked')}>Revoke visit consent</button>}
          </div>)}</div>
        </form>
      </section>}
      {panel==='addresses' && isAdmin && <section className="grid gap-5 lg:grid-cols-3">
        <form className="card space-y-2 p-5" onSubmit={e=>{e.preventDefault();void act(async()=>{
          const response=await call<Address>('/api/addresses','POST',address);setAddress({...emptyAddress});
          setNotice(response.reused?'Existing household unit was reused':'New address created; location verification still required');
        },'Address saved in master.');}}>
          <h2 className="font-display text-lg font-bold">Address source of truth</h2>
          {(['unit','building','street','locality','city','state','pincode'] as const).map(k=><label className="block field-label" key={k}>{k}
            <input className={inputClass} value={address[k]} onChange={e=>setAddress({...address,[k]:e.target.value})} required={['unit','city','state','pincode'].includes(k)}/></label>)}
          <button className="btn-primary" disabled={busy}>Save or reuse exact unit</button>
        </form>
        <div className="card space-y-4 p-5">
          <form className="space-y-2" onSubmit={e=>{e.preventDefault();void act(()=>call(`/api/families/${familyLink.family_id}/addresses`,'POST',{address_id:familyLink.address_id}),'Address linked to family.');}}>
            <h2 className="font-display text-lg font-bold">Link family home</h2>
            <select required className={inputClass} value={familyLink.family_id} onChange={e=>setFamilyLink({...familyLink,family_id:e.target.value})}>
              <option value="">Choose family</option>{families.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select>
            <select required className={inputClass} value={familyLink.address_id} onChange={e=>setFamilyLink({...familyLink,address_id:e.target.value})}>
              <option value="">Choose address</option>{addresses.map(a=><option key={a.id} value={a.id}>{a.unit}, {a.building}, {a.locality}</option>)}</select>
            <button disabled={busy} className="btn-primary">Link family address</button>
          </form>
          <form className="space-y-2 border-t pt-3" onSubmit={e=>{e.preventDefault();void act(()=>call(`/api/devotees/${personLink.devotee_id}/addresses`,'POST',{address_id:personLink.address_id}),'Devotee address linked.');}}>
            <h3 className="font-display text-lg font-bold">Link devotee address</h3>
            <select required className={inputClass} value={personLink.devotee_id} onChange={e=>setPersonLink({...personLink,devotee_id:e.target.value})}>
              <option value="">Choose devotee</option>{devotees.map(d=><option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>)}</select>
            <select required className={inputClass} value={personLink.address_id} onChange={e=>setPersonLink({...personLink,address_id:e.target.value})}>
              <option value="">Choose address</option>{addresses.map(a=><option key={a.id} value={a.id}>{a.unit}, {a.building}, {a.locality}</option>)}</select>
            <button disabled={busy} className="btn-secondary">Link person's home</button>
            <button disabled={!personLink.devotee_id||busy} type="button" className="btn-secondary" onClick={()=>void act(async()=>{
              setSuggestions(await call<{family_id:string;family_name:string;family_code:string;score:number;reasons:string[]}[]>(`/api/devotees/${personLink.devotee_id}/family-suggestions`));
            },'Family suggestions generated for review.')}>Suggest family by address/contact</button>
            {suggestions.map(s=><p className="text-xs" key={s.family_id}>{s.family_name} ({s.score}): {s.reasons.join('; ')} • review before linking</p>)}
          </form>
          <p className="text-xs text-maroon-800/70">One building may contain many households. Unit + building + street + locality + pincode define the canonical address key.</p>
        </div>
        <form className="card space-y-3 p-5" onSubmit={e=>{e.preventDefault();void act(()=>call(`/api/addresses/${verification.address_id}/verify`,'PATCH',{
          latitude:Number(verification.latitude),longitude:Number(verification.longitude),accuracy_m:Number(verification.accuracy_m),source:verification.source,
        }),'Verified coordinates saved for household mapping.');}}>
          <h2 className="font-display text-lg font-bold">Verify house coordinates</h2>
          <p className="text-xs">Use surveyed/on-site coordinates for the household, not the sevadar’s current GPS unless physically at that address.</p>
          <select required className={inputClass} value={verification.address_id} onChange={e=>setVerification({...verification,address_id:e.target.value})}>
            <option value="">Choose address</option>{addresses.map(a=><option key={a.id} value={a.id}>{a.unit}, {a.locality} {a.verified?'✓':''}</option>)}</select>
          {(['latitude','longitude','accuracy_m','source'] as const).map(k=><label className="block field-label" key={k}>{k}
            <input required className={inputClass} value={verification[k]} onChange={e=>setVerification({...verification,[k]:e.target.value})}/></label>)}
          <button disabled={busy} className="btn-primary">Approve geo-location</button>
        </form>
      </section>}
      {panel==='review' && isAdmin && <section className="space-y-4">
        <div className="flex justify-between"><h2 className="font-display text-xl font-bold">Controlled duplicate review</h2>
          <button className="btn-secondary" disabled={busy} onClick={()=>void act(()=>call('/api/dedup/scan','POST',{}),'Candidate rescan completed')}>Rescan</button></div>
        <p className="text-sm">Matching name, email or phone creates a review candidate. Shared phone/address alone does <strong>not</strong> prove a duplicate. No automatic merge is permitted.</p>
        {candidates.length===0 && <p className="card p-5">No pending duplicate candidates.</p>}
        {candidates.map(c=><div key={c.id} className="card space-y-3 p-5">
          <strong>Score: {Math.round(c.score)}/100</strong><p className="text-xs">Signals: {c.reasons.join(', ')}</p>
          <div className="grid gap-3 md:grid-cols-2">{[c.devotee_a,c.devotee_b].map(d=><div className="rounded-lg border p-3" key={d.id}>
            <p className="font-semibold">{d.first_name} {d.last_name}</p><p className="break-all text-xs">{d.devotee_code}</p><p className="text-sm">{d.phone}</p>
            <button disabled={busy} className="btn-secondary mt-2" onClick={()=>chooseReview(c,'merge',d.id)}>Same person: retain this ID</button></div>)}</div>
          <label className="block field-label">Decision rationale (min 10 characters)
            <textarea className={inputClass} rows={2} value={reviewNotes[c.id]||''} onChange={e=>setReviewNotes({...reviewNotes,[c.id]:e.target.value})} placeholder="Evidence reviewed; why same person / different relative?"/></label>
          <div className="flex gap-2"><button disabled={busy} className="btn-secondary" onClick={()=>chooseReview(c,'related')}>Different people • related</button>
            <button disabled={busy} className="btn-secondary" onClick={()=>chooseReview(c,'reject')}>Not duplicate</button></div>
        </div>)}
      </section>}
      {panel==='visits' && <section className="space-y-5">
        <div className="card space-y-3 p-5">
          <h2 className="font-display text-xl font-bold">Sevadar GPS → nearby verified households</h2>
          <p className="text-sm">GPS is requested only after you opt in. The server retains only your most recent coordinate for 15 minutes; it does not build a continuous movement history. Results are limited to families who consented to visits.</p>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={gpsConsent} onChange={e=>setGpsConsent(e.target.checked)}/> I consent to sharing my current GPS position for visit planning</label>
          <div className="flex flex-wrap gap-3"><button disabled={busy||!gpsConsent} onClick={()=>void collectLocation()} className="btn-primary">{busy?'Working…':'Find households within 3 km'}</button>
            <button disabled={busy} onClick={stopLocation} className="btn-secondary">Stop location sharing</button></div>
          {isAdmin && <p className="text-xs text-maroon-800/80">Admin logins are not sevadar profiles by default. Sign in with a sevadar account created by a super admin to access GPS visits.</p>}
        </div>
        {gps && <NearbyMap gps={gps} homes={nearby} radiusKm={3}/>}
        <div className="grid gap-4 md:grid-cols-2">
          {nearby.map(h=><div className="card space-y-2 p-4" key={h.family_id+'-'+h.address_id}>
            <h3 className="font-display text-lg font-bold">{h.family_name}</h3>
            <p className="text-xs">Family ID: {h.family_code}</p><p className="text-sm">{h.address}</p>
            <p className="font-semibold">{h.distance_km} km from current GPS</p>
            <div className="flex flex-wrap gap-2"><a className="btn-secondary" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&${gps?`origin=${gps.lat},${gps.lon}&`:''}destination=${h.latitude},${h.longitude}`}>Navigate to home</a>
            <button className="btn-primary" disabled={busy} onClick={()=>void act(async()=>{
              await call('/api/sevadars/me/assignments','POST',{family_id:h.family_id,address_id:h.address_id,purpose:'community visit'});
              setAssignments(await call<Assignment[]>('/api/sevadars/me/assignments'));
            },'Visit assigned to your account.')}>Assign visit</button></div>
          </div>)}
        </div>
        {nearby.length===0 && <p className="text-sm text-maroon-800/80">No nearby households shown. Families require explicit visit consent, a linked address and administrator-verified coordinates.</p>}
        <h2 className="font-display text-xl font-bold">My visit assignments</h2>
        {assignments.map(a=><div key={a.id} className="card flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
          <div>Family: {a.family_id.slice(0,8)}… • {a.distance_km} km • {a.status}</div>
          {a.status==='assigned' && <div className="flex gap-2">{(['completed','not_home','reschedule','declined'] as const).map(outcome=><button key={outcome} disabled={busy}
            className="btn-secondary" onClick={()=>void act(async()=>{
              await call(`/api/sevadars/me/assignments/${a.id}/visits`,'POST',{outcome,notes:'Status recorded by sevadar'});
              setAssignments(await call<Assignment[]>('/api/sevadars/me/assignments'));
            },'Visit result saved.')}>{outcome.replace('_',' ')}</button>)}</div>}
        </div>)}
      </section>}
    </>}
  </div>;
}
