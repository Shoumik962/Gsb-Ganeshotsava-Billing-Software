import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import ReceiptView from './ReceiptView';
import type { BookingRecord } from '../lib/bookingStore';

type Address = { unit:string;building:string;street:string;locality:string;city:string;state:string;pincode:string };
type Match = { address_id:string;score:number;formatted:string;requires_confirmation:boolean };
type Account = { id:string;username:string;role:string;full_name?:string;email?:string;phone?:string;devotee_code?:string;
  email_verified:boolean;phone_verified:boolean;profile_completed:boolean;gotra?:string;nakshatra?:string;
  address?:Address;family_id?:string;family_link_pending?:boolean;family_link_available?:boolean;receipt_sms_opt_in:boolean };
type Booking = { id:string;items:{name:string;price:number}[];amount:number;status:string;receipt_no?:string;preferred_date?:string;created_at:string };
const input='field-input w-full';
const EMPTY_ADDRESS:Address={unit:'',building:'',street:'',locality:'',city:'Mumbai',state:'Maharashtra',pincode:''};
const GOTRAS=['Kashyapa','Bharadwaja','Vashishta','Vishwamitra','Jamadagni','Gautama','Atri','Kaundinya','Harita','Garga','Shandilya','Vatsa','Unknown / Not sure'];
const NAKSHATRAS=['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati','Unknown / Not sure'];

function PostalFields({address,onChange}:{address:Address;onChange:(a:Address)=>void}){
  const entries:[keyof Address,string,boolean][]=[
    ['unit','Flat / house number',true],['building','Building / society',false],['street','Street / road',true],
    ['locality','Locality / area',true],['city','City',true],['state','State',true],['pincode','PIN code',true]];
  return <div className="grid gap-3 sm:grid-cols-2">{entries.map(([key,label,required])=><label key={key} className="block text-sm font-semibold">{label}
    <input className={input} required={required} maxLength={key==='pincode'?6:200} value={address[key]}
      inputMode={key==='pincode'?'numeric':'text'} pattern={key==='pincode'?'[0-9]{6}':undefined}
      onChange={e=>onChange({...address,[key]:e.target.value})}/></label>)}</div>;
}

export default function AccountPortal(){
  const [token,setToken]=useState(()=>sessionStorage.getItem('ganesh_devotee_token')||'');
  const [profile,setProfile]=useState<Account|null>(null);
  const [bookings,setBookings]=useState<Booking[]>([]);
  const [openedReceipt,setOpenedReceipt]=useState<BookingRecord|null>(null);
  const [mode,setMode]=useState<'login'|'signup'|'verify'>('signup');
  const [username,setUsername]=useState('');const [password,setPassword]=useState('');
  const [email,setEmail]=useState('');const [fullName,setFullName]=useState('');const [phone,setPhone]=useState('');
  const [gotra,setGotra]=useState('Unknown / Not sure');const [nakshatra,setNakshatra]=useState('Unknown / Not sure');
  const [address,setAddress]=useState<Address>(EMPTY_ADDRESS);
  const [matches,setMatches]=useState<Match[]>([]);const [addressChecked,setAddressChecked]=useState(false);const [addressError,setAddressError]=useState('');
  const [selectedAddressId,setSelectedAddressId]=useState('');const [confirmDifferent,setConfirmDifferent]=useState(false);
  const [sharedPhone,setSharedPhone]=useState(false);const [receiptOptIn,setReceiptOptIn]=useState(false);
  const [requestFamilyLink,setRequestFamilyLink]=useState(false);
  const [smsCode,setSmsCode]=useState('');const [emailCode,setEmailCode]=useState('');
  const [smsVerified,setSmsVerified]=useState(false);const [emailVerified,setEmailVerified]=useState(false);
  const [localDevEnabled,setLocalDevEnabled]=useState(false);
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');
  useEffect(()=>{
    let active=true;
    apiRequest<{enabled:boolean}>('/api/auth/local-dev-verification')
      .then(status=>{if(active)setLocalDevEnabled(Boolean(status.enabled));})
      .catch(()=>{if(active)setLocalDevEnabled(false);});
    return()=>{active=false;};
  },[]);
  const reload=useCallback(async(t:string)=>{
    const [account,orders]=await Promise.all([
      apiRequest<Account>('/api/account/me',{},t),apiRequest<Booking[]>('/api/account/bookings',{},t)]);
    setProfile(account);setBookings(orders);setGotra(account.gotra||'Unknown / Not sure');
    setNakshatra(account.nakshatra||'Unknown / Not sure');setReceiptOptIn(account.receipt_sms_opt_in);
  },[]);
  useEffect(()=>{
    if(!token){setProfile(null);setBookings([]);return;}
    let active=true;
    reload(token).catch(e=>{if(active){setError(e instanceof Error?e.message:'Session expired');
      sessionStorage.removeItem('ganesh_devotee_token');setToken('');}});
    return ()=>{active=false;};
  },[token,reload]);

  const setPostal=(next:Address)=>{setAddress(next);setMatches([]);setAddressChecked(false);setAddressError('');setSelectedAddressId('');setConfirmDifferent(false);};
  const completeAddress=Boolean(address.unit.trim().length>=1&&address.street.trim().length>=2&&address.locality.trim().length>=2&&address.city.trim().length>=2&&address.state.trim().length>=2&&/^\d{6}$/.test(address.pincode));
  const needsAddressCheck=mode==='signup'||Boolean(token&&profile&&!profile.profile_completed&&!profile.address);
  useEffect(()=>{
    if(!needsAddressCheck||!completeAddress)return;
    let active=true;
    const timer=setTimeout(()=>{
      apiRequest<{matches:Match[]}>('/api/addresses/matches',{method:'POST',body:JSON.stringify({address})})
        .then(result=>{if(active){setMatches(result.matches);setAddressChecked(true);setAddressError('');}})
        .catch((e)=>{if(active){setAddressChecked(false);setAddressError(e instanceof Error?e.message:'Address lookup unavailable');}});
    },700);
    return()=>{active=false;clearTimeout(timer);};
  },[address,completeAddress,needsAddressCheck]);

  const signin=async()=>{
    const result=await apiRequest<{access_token:string;role:string}>('/api/auth/login',{
      method:'POST',body:JSON.stringify({username,password})});
    if(result.role!=='devotee')throw new Error('Staff accounts sign in from the Staff/Admin Portal.');
    sessionStorage.setItem('ganesh_devotee_token',result.access_token);
    setToken(result.access_token);setPassword('');
  };
  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();setBusy(true);setError('');setNotice('');
    try{
      if(mode==='signup'){
        if(!addressChecked)throw new Error('Complete the address and run the matching check before registering.');
        if(matches.length&&!selectedAddressId&&!confirmDifferent)
          throw new Error('A 90%+ address match was found. Confirm the matching address or select a different-address option.');
        const result=await apiRequest<{devotee_code:string;duplicate_review_required:boolean;verification_delivery_errors:string[]}>('/api/auth/register',{
          method:'POST',body:JSON.stringify({username,password,email,full_name:fullName,phone,gotra,nakshatra,address,
            selected_address_id:selectedAddressId||null,confirm_new_address:confirmDifferent,
            shared_phone_confirmed:sharedPhone,receipt_sms_opt_in:receiptOptIn})});
        setNotice(`Devotee ID ${result.devotee_code} created. Confirm SMS and email codes next. ${result.duplicate_review_required?'A potential duplicate is pending staff review.':''} ${result.verification_delivery_errors.join('; ')}`);
        setMode('verify');return;
      }
      await signin();
    }catch(e){setError(e instanceof Error?e.message:'Request failed');}
    finally{setBusy(false);}
  };
  async function verify(channel:'phone'|'email',code:string){
    setBusy(true);setError('');setNotice('');
    try{
      const result=await apiRequest<{email_verified:boolean;phone_verified:boolean}>('/api/auth/verify',{
        method:'POST',body:JSON.stringify({username,password,channel,code})});
      setSmsVerified(result.phone_verified);setEmailVerified(result.email_verified);
      if(result.phone_verified&&result.email_verified){setNotice('Both contacts verified. Signing in…');await signin();}
      else setNotice(`${channel==='phone'?'Phone':'Email'} verified. Complete the other verification.`);
    }catch(e){setError(e instanceof Error?e.message:'Verification failed');}
    finally{setBusy(false);}
  }
  async function localDevVerify(){
    setBusy(true);setError('');setNotice('');
    try{
      await apiRequest('/api/auth/local-dev-verify',{
        method:'POST',body:JSON.stringify({username,password})});
      setSmsVerified(true);setEmailVerified(true);
      await signin();
      setNotice('LOCAL DEVELOPMENT ONLY: contact checks simulated. Your account is ready for QA.');
    }catch(e){setError(e instanceof Error?e.message:'Local developer verification unavailable');}
    finally{setBusy(false);}
  }
  async function resend(channel:'phone'|'email'){
    setBusy(true);setError('');setNotice('');
    try{await apiRequest('/api/auth/resend',{method:'POST',body:JSON.stringify({username,password,channel})});
      setNotice(`A fresh ${channel} code was requested. Check the configured delivery channel.`);}
    catch(e){setError(e instanceof Error?e.message:'Could not resend');}
    finally{setBusy(false);}
  }
  async function requestHouseholdReview(){
    setBusy(true);setError('');setNotice('');
    try{const res=await apiRequest<{family_link_pending:boolean}>('/api/account/complete-profile',
      {method:'POST',body:JSON.stringify({gotra,nakshatra,receipt_sms_opt_in:receiptOptIn,confirm_residence:true,request_family_link:true})},token);
      setNotice(res.family_link_pending?'Family link request submitted for staff review.':'No eligible existing household was found.');
      await reload(token);
    }catch(e){setError(e instanceof Error?e.message:'Could not request review');}
    finally{setBusy(false);}
  }
  async function finishProfile(event:React.FormEvent){
    event.preventDefault();setBusy(true);setError('');setNotice('');
    try{
      const missingAddress=!profile?.address;
      if(missingAddress){
        if(!addressChecked)throw new Error('Complete the address and run the matching check before saving.');
        if(matches.length&&!selectedAddressId&&!confirmDifferent)
          throw new Error('A 90%+ address match was found. Confirm the matching address or select a different-address option.');
      }
      const res=await apiRequest<{family_id?:string;family_link_pending:boolean}>('/api/account/complete-profile',{
        method:'POST',body:JSON.stringify({gotra,nakshatra,receipt_sms_opt_in:receiptOptIn,confirm_residence:true,request_family_link:requestFamilyLink,
          ...(missingAddress?{address,selected_address_id:selectedAddressId||null,confirm_new_address:confirmDifferent}:{})})},token);
      setNotice(res.family_link_pending?'Profile saved. A staff member must confirm your family link.':res.family_id?`Profile saved. Family ID: ${res.family_id}`:'Profile saved. No household family link was assigned.');
      await reload(token);
    }catch(e){setError(e instanceof Error?e.message:'Profile update failed');}
    finally{setBusy(false);}
  }
  async function viewReceipt(receiptNo:string){
    setBusy(true);setError('');
    try{setOpenedReceipt(await apiRequest<BookingRecord>(`/api/account/receipts/${encodeURIComponent(receiptNo)}`,{},token));}
    catch(e){setError(e instanceof Error?e.message:'Receipt could not be opened');}
    finally{setBusy(false);}
  }
  const logout=()=>{sessionStorage.removeItem('ganesh_devotee_token');setToken('');setProfile(null);setNotice('Signed out.');};

  if(openedReceipt)return <ReceiptView record={openedReceipt} onClose={()=>setOpenedReceipt(null)}/>;
  return <div className="mx-auto max-w-3xl space-y-6">
    <div className="rounded-2xl border border-gold-300/60 bg-cream-50/90 p-6 shadow-2xs">
      <h1 className="font-display text-2xl font-bold text-maroon-950">My Devotee Account</h1>
      <p className="mt-2 text-sm">Verified phone and email, one permanent Devotee ID, confirmed family links and reusable address records.</p>
    </div>
    {error&&<p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-900">{error}</p>}
    {notice&&<p role="status" className="rounded-lg bg-green-50 p-3 text-green-900">{notice}</p>}
    {token&&profile ? <div className="space-y-5">
      <div className="card space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Welcome, {profile.full_name||profile.username}</h2><button className="btn-secondary" onClick={logout}>Sign out</button></div>
        <p className="text-sm">Devotee ID: <strong>{profile.devotee_code}</strong> · Family ID: <strong>{profile.family_id||'Not yet assigned'}</strong></p>
        <p className="text-sm">Verified email: {profile.email} · Verified phone: {profile.phone}</p>
        {profile.address&&<p className="text-sm">Address: {[profile.address.unit,profile.address.building,profile.address.street,profile.address.locality,profile.address.city,profile.address.pincode].filter(Boolean).join(', ')}</p>}
        {profile.family_link_pending&&<p className="rounded-lg bg-amber-50 p-3 text-sm">A possible existing family at this address was found. Staff must verify the relationship before linking Family IDs.</p>}
        {profile.family_link_available&&<div className="rounded-lg bg-amber-50 p-3 text-sm space-y-2"><p>No existing family link is confirmed for this address. You can request staff review if you belong to an existing household.</p><button className="btn-secondary" disabled={busy} onClick={()=>void requestHouseholdReview()}>Request family-link review</button></div>}
      </div>
      {!profile.profile_completed ? <form onSubmit={finishProfile} className="card space-y-4 p-5">
        <h2 className="text-xl font-bold">Complete your profile before seva booking</h2>
        <p className="text-sm">Please confirm your registered address and Gotra/Nakshatra. Unknown is acceptable. A family link is never created just because an address matches.</p>
        {!profile.address&&<div className="rounded-lg border p-3"><h3 className="font-bold">Full residential address (mandatory)</h3><PostalFields address={address} onChange={setPostal}/>
          <div className="mt-3 text-sm">{!completeAddress?'Enter flat/house number, street (2+ chars), locality, city, state and six-digit PIN.':addressError?<span className="text-red-700">{addressError}</span>:!addressChecked?'Checking address matches…':matches.length?`${matches.length} similar address(es) found (≥90%). Confirm before saving.`:'No 90%+ address match found.'}</div>
          {matches.length>0&&<fieldset className="mt-2 space-y-2"><legend className="font-semibold text-sm">Choose an address</legend>{matches.map(m=><label key={m.address_id} className="flex gap-2 text-sm"><input type="radio" name="addressChoiceProfile" checked={selectedAddressId===m.address_id} onChange={()=>{setSelectedAddressId(m.address_id);setConfirmDifferent(false);}}/><span>{m.formatted} ({m.score}% match)</span></label>)}
            <label className="flex gap-2 text-sm"><input type="radio" name="addressChoiceProfile" checked={confirmDifferent} onChange={()=>{setSelectedAddressId('');setConfirmDifferent(true);}}/>This is a different residence; create a separate address</label></fieldset>}
        </div>}
        <label className="block text-sm font-semibold">Gotra<select className={input} value={gotra} onChange={e=>setGotra(e.target.value)}>{GOTRAS.map(s=><option key={s}>{s}</option>)}</select></label>
        <label className="block text-sm font-semibold">Nakshatra<select className={input} value={nakshatra} onChange={e=>setNakshatra(e.target.value)}>{NAKSHATRAS.map(s=><option key={s}>{s}</option>)}</select></label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={requestFamilyLink} onChange={e=>setRequestFamilyLink(e.target.checked)}/> If an existing household uses my address, request a staff-reviewed family link (not automatic)</label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={receiptOptIn} onChange={e=>setReceiptOptIn(e.target.checked)}/> Send verified receipt references to my registered mobile by SMS</label>
        <button disabled={busy||(!profile.address&&(!addressChecked||(matches.length>0&&!selectedAddressId&&!confirmDifferent)))} className="btn-primary w-full">{busy?'Saving…':'Confirm residence and finish profile'}</button>
      </form>:<button className="btn-primary" onClick={()=>{window.location.hash='#sevas';}}>Browse and book sevas</button>}
      <div className="card p-5"><h2 className="text-xl font-bold">My booking history ({bookings.length})</h2>
        <div className="mt-3 space-y-3">{bookings.length===0&&<p className="text-sm">No bookings yet.</p>}{bookings.map(b=><div key={b.id} className="rounded-lg border p-3 text-sm"><strong>{b.items.map(x=>x.name).join(', ')||'Booking'}</strong> · ₹{b.amount.toLocaleString('en-IN')}<p>Status: {b.status} · {new Date(b.created_at).toLocaleString('en-IN')}</p>{b.receipt_no&&<p>Receipt ID: <strong>{b.receipt_no}</strong> <button className="btn-secondary ml-2 text-xs" disabled={busy} onClick={()=>void viewReceipt(b.receipt_no!)}>View / Print Receipt</button></p>}</div>)}</div>
      </div>
    </div> : mode==='verify' ? <div className="card space-y-5 p-6">
      <h2 className="text-xl font-bold">Verify your mobile and email</h2>
      <p className="text-sm">Enter each six-digit code. Codes expire after 10 minutes. In local console test mode, codes appear only in the FastAPI terminal.</p>
      <div className="space-y-2"><label className="block font-semibold">SMS code {smsVerified?'✓ Verified':''}<input className={input} inputMode="numeric" maxLength={6} value={smsCode} onChange={e=>setSmsCode(e.target.value)}/></label>
        <button type="button" className="btn-primary" disabled={busy||smsVerified||smsCode.length!==6} onClick={()=>verify('phone',smsCode)}>Verify phone</button> <button type="button" className="btn-secondary" disabled={busy||smsVerified} onClick={()=>resend('phone')}>Resend SMS</button></div>
      <div className="space-y-2"><label className="block font-semibold">Email code {emailVerified?'✓ Verified':''}<input className={input} inputMode="numeric" maxLength={6} value={emailCode} onChange={e=>setEmailCode(e.target.value)}/></label>
        <button type="button" className="btn-primary" disabled={busy||emailVerified||emailCode.length!==6} onClick={()=>verify('email',emailCode)}>Verify email</button> <button type="button" className="btn-secondary" disabled={busy||emailVerified} onClick={()=>resend('email')}>Resend email</button></div>
      {localDevEnabled&&<div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-4 space-y-2">
        <p className="font-bold text-amber-950">Developer testing only — no SMS or email required</p>
        <p className="text-sm text-amber-900">This marks contacts as SIMULATED verified in your local ganeshotsav_dev database. It does not prove ownership. Never use it with real devotees or in production.</p>
        <button type="button" className="btn-primary" disabled={busy||!username||!password} onClick={()=>void localDevVerify()}>{busy?'Please wait…':'Simulate verification and sign in'}</button>
      </div>}
      <button className="btn-secondary" onClick={()=>setMode('login')}>Back to sign in</button>
    </div> : <div className="card p-5 sm:p-8 shadow-soft">
      <div className="mb-5 flex flex-wrap gap-2"><button className={mode==='signup'?'btn-primary':'btn-secondary'} onClick={()=>setMode('signup')}>Create account</button><button className={mode==='login'?'btn-primary':'btn-secondary'} onClick={()=>setMode('login')}>Sign in</button><button className="btn-secondary" onClick={()=>setMode('verify')}>Verify an existing signup</button></div>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-semibold">Username<input className={input} autoComplete="username" required minLength={3} value={username} onChange={e=>setUsername(e.target.value)}/></label>
        {mode==='signup'&&<>
          <label className="block text-sm font-semibold">Full name<input className={input} autoComplete="name" required minLength={3} value={fullName} onChange={e=>setFullName(e.target.value)}/></label>
          <label className="block text-sm font-semibold">Email<input className={input} type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
          <label className="block text-sm font-semibold">Mobile number<input className={input} type="tel" autoComplete="tel" required value={phone} onChange={e=>setPhone(e.target.value)}/></label>
          <div className="rounded-lg border p-3"><h3 className="font-bold">Full residential address (mandatory)</h3><PostalFields address={address} onChange={setPostal}/>
            <div className="mt-3 text-sm">{!completeAddress?'Enter flat/house number, street (2+ chars), locality, city, state and six-digit PIN.':addressError?<span className="text-red-700">{addressError}</span>:!addressChecked?'Checking address matches…':matches.length?`${matches.length} similar address(es) found (≥90%). Confirm before registration.`:'No 90%+ address match found.'}</div>
            {matches.length>0&&<fieldset className="mt-2 space-y-2"><legend className="font-semibold text-sm">Choose an address</legend>{matches.map(m=><label key={m.address_id} className="flex gap-2 text-sm"><input type="radio" name="addressChoice" checked={selectedAddressId===m.address_id} onChange={()=>{setSelectedAddressId(m.address_id);setConfirmDifferent(false);}}/><span>{m.formatted} ({m.score}% match)</span></label>)}
              <label className="flex gap-2 text-sm"><input type="radio" name="addressChoice" checked={confirmDifferent} onChange={()=>{setSelectedAddressId('');setConfirmDifferent(true);}}/>This is a different residence; create a separate address</label>
              <p className="text-xs">Selecting an address does not automatically link you to its family. Sign in and complete verification to request a family link.</p></fieldset>}
          </div>
          <label className="block text-sm font-semibold">Gotra<select className={input} value={gotra} onChange={e=>setGotra(e.target.value)}>{GOTRAS.map(s=><option key={s}>{s}</option>)}</select></label>
          <label className="block text-sm font-semibold">Nakshatra<select className={input} value={nakshatra} onChange={e=>setNakshatra(e.target.value)}>{NAKSHATRAS.map(s=><option key={s}>{s}</option>)}</select></label>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={sharedPhone} onChange={e=>setSharedPhone(e.target.checked)}/>This phone may already be used by another family member; I am registering a different person.</label>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={receiptOptIn} onChange={e=>setReceiptOptIn(e.target.checked)}/>I agree to receive my receipt reference via transactional SMS.</label>
        </>}
        <label className="block text-sm font-semibold">Password (minimum 12 characters)<input className={input} type="password" autoComplete={mode==='signup'?'new-password':'current-password'} required minLength={12} value={password} onChange={e=>setPassword(e.target.value)}/></label>
        <button className="btn-primary w-full" disabled={busy|| (mode==='signup'&&(!addressChecked||(matches.length>0&&!selectedAddressId&&!confirmDifferent)))}>{busy?'Please wait…':mode==='signup'?'Create account and send verification codes':'Sign in'}</button>
        {mode==='login'&&localDevEnabled&&<div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
          <p className="text-sm font-semibold text-amber-950">Local QA account not verified yet?</p>
          <button type="button" className="btn-secondary" disabled={busy||!username||!password} onClick={()=>void localDevVerify()}>Simulate contact verification + sign in (local only)</button>
          <p className="text-xs text-amber-900">Available only with explicit local-dev settings. Not available in production.</p>
        </div>}
      </form>
    </div>}
  </div>;
}
