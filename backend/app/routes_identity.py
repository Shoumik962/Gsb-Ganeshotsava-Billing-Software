from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_
from sqlalchemy.orm import Session
from .database import get_db
from .identity import normalize, phone_normalize, address_key, scan_person, merge_devotees
from .models import (Address, Devotee, DevoteeAddress, DuplicateCandidate, DuplicateDecision, DedupRule, Family,
                     FamilyAddress, FamilyMember, FamilyConsentAudit, MergeAudit, User, utcnow)
from .schemas import AddressIn, AddressLink, DecisionIn, DevoteeIn, FamilyIn, FamilyMemberIn, GeoVerify, Login, UserIn, VisitConsentIn
from .security import current_user, hash_password, require_roles, sign_token, verify_password

router = APIRouter(prefix='/api', tags=['identity & staff'])
admin = require_roles('super_admin', 'admin')
staff = require_roles('super_admin', 'admin', 'sevadar')

def person_view(d: Devotee):
    return {'id':d.id,'devotee_code':d.devotee_code,'first_name':d.first_name,'last_name':d.last_name,
            'phone':d.phone,'email':d.email,'status':d.status,'merged_into_id':d.merged_into_id}

def address_view(a: Address):
    return {'id':a.id,'unit':a.unit,'building':a.building,'street':a.street,'locality':a.locality,
            'city':a.city,'state':a.state,'pincode':a.pincode,'latitude':a.latitude,'longitude':a.longitude,
            'verified':a.verified,'geo_accuracy_m':a.geo_accuracy_m}

@router.post('/auth/login')
def login(data: Login, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.username == data.username.strip().lower()))
    if not user or not user.active or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, 'Invalid login')
    return {'access_token':sign_token(user),'token_type':'bearer','role':user.role,'username':user.username}

@router.get('/auth/me')
def me(user: User = Depends(current_user)):
    return {'id':user.id,'username':user.username,'role':user.role}

@router.post('/admin/users', status_code=201)
def create_user(data: UserIn, db: Session = Depends(get_db), user: User = Depends(require_roles('super_admin'))):
    if data.role not in {'admin','sevadar'}: raise HTTPException(422, 'Role must be admin or sevadar')
    from .models import Sevadar
    username = data.username.strip().lower()
    if db.scalar(select(User.id).where(User.username == username)): raise HTTPException(409, 'Username already exists')
    new = User(username=username, password_hash=hash_password(data.password), role=data.role)
    db.add(new); db.flush()
    if new.role == 'sevadar': db.add(Sevadar(user_id=new.id, zone=data.zone))
    db.commit()
    return {'id':new.id,'username':new.username,'role':new.role}

@router.post('/devotees', status_code=201)
def create_devotee(data: DevoteeIn, db: Session = Depends(get_db), user: User = Depends(admin)):
    first = data.first_name.strip()
    last = data.last_name.strip()
    phone = phone_normalize(data.phone)
    email = data.email.strip().lower() if data.email else None
    person = Devotee(first_name=first,last_name=last,normalized_name=normalize(f'{first} {last}'),
                     date_of_birth=data.date_of_birth,phone=phone,email=email)
    db.add(person); db.flush()
    matches = scan_person(db, person)
    result = person_view(person)
    result['potential_duplicate_count'] = len(matches)
    result['dedup_review_required'] = len(matches) > 0
    db.commit()
    return result

@router.get('/devotees')
def list_devotees(q: str = '', db: Session = Depends(get_db), user: User = Depends(admin)):
    query = select(Devotee).where(Devotee.status == 'active')
    if q.strip():
        pattern = '%' + q.strip().lower() + '%'
        query = query.where(or_(Devotee.normalized_name.like(pattern),Devotee.phone.like(pattern),Devotee.devotee_code.ilike(pattern)))
    return [person_view(d) for d in db.scalars(query.order_by(Devotee.created_at.desc()).limit(100))]

@router.get('/devotees/{devotee_id}/family-suggestions')
def family_suggestions(devotee_id: str, db: Session=Depends(get_db), user: User=Depends(admin)):
    """Recommend a Family ID using confirmed household/contact links, never auto-enrol."""
    person=db.get(Devotee,devotee_id)
    if not person or person.status!='active': raise HTTPException(404,'Active devotee not found')
    joined={m.family_id for m in db.scalars(select(FamilyMember).where(FamilyMember.devotee_id==devotee_id,FamilyMember.end_at.is_(None)))}
    own_addresses={r.address_id for r in db.scalars(select(DevoteeAddress).where(DevoteeAddress.devotee_id==devotee_id,DevoteeAddress.is_current==True))}
    results=[]
    for family in db.scalars(select(Family).where(Family.status=='active').limit(500)).all():
        if family.id in joined: continue
        reasons=[];score=0
        family_addresses={x.address_id for x in db.scalars(select(FamilyAddress).where(FamilyAddress.family_id==family.id,FamilyAddress.current==True))}
        if own_addresses & family_addresses:
            reasons.append('shared exact unit address');score+=75
        if person.phone and person.phone==family.contact_phone:
            reasons.append('shared family contact (not proof)');score+=30
        if person.phone:
            members=db.scalars(select(FamilyMember).where(FamilyMember.family_id==family.id,FamilyMember.end_at.is_(None))).all()
            if any((db.get(Devotee,m.devotee_id) or person).phone == person.phone for m in members):
                reasons.append('same phone as an existing member (not proof)');score+=25
        if score>=25:
            results.append({'family_id':family.id,'family_code':family.family_code,'family_name':family.name,
                            'score':min(score,100),'reasons':reasons,'requires_review':True})
    return sorted(results,key=lambda x:x['score'],reverse=True)[:20]

@router.post('/families', status_code=201)
def create_family(data: FamilyIn, db: Session = Depends(get_db), user: User = Depends(admin)):
    if data.head_devotee_id and not db.get(Devotee,data.head_devotee_id): raise HTTPException(404, 'Head devotee not found')
    if data.visit_consent and (not data.visit_consent_source or not data.visit_consent_ref):
        raise HTTPException(422, 'Consent source and evidence reference are required')
    family = Family(name=data.name.strip(), head_devotee_id=data.head_devotee_id,
                    contact_phone=phone_normalize(data.contact_phone), visit_consent=data.visit_consent,
                    visit_consent_source=data.visit_consent_source if data.visit_consent else None,
                    visit_consent_ref=data.visit_consent_ref if data.visit_consent else None,
                    consent_updated_at=utcnow() if data.visit_consent else None)
    db.add(family); db.flush()
    if data.head_devotee_id: db.add(FamilyMember(family_id=family.id,devotee_id=data.head_devotee_id,relationship='head',is_primary_contact=True))
    if data.visit_consent:
        db.add(FamilyConsentAudit(family_id=family.id, consent=True, source=data.visit_consent_source,
                                  evidence_ref=data.visit_consent_ref, staff_user_id=user.id))
    db.commit()
    return {'id':family.id,'family_code':family.family_code,'name':family.name,'visit_consent':family.visit_consent}

@router.get('/families')
def list_families(db: Session = Depends(get_db), user: User = Depends(admin)):
    families = db.scalars(select(Family).where(Family.status=='active').order_by(Family.name).limit(100)).all()
    return [{'id':f.id,'family_code':f.family_code,'name':f.name,'head_devotee_id':f.head_devotee_id,'visit_consent':f.visit_consent,
             'members':[{'devotee_id':m.devotee_id,'relationship':m.relationship} for m in db.scalars(select(FamilyMember).where(FamilyMember.family_id==f.id,FamilyMember.end_at.is_(None)))],
             'addresses':[{'address_id':a.address_id} for a in db.scalars(select(FamilyAddress).where(FamilyAddress.family_id==f.id,FamilyAddress.current==True))]}
            for f in families]

@router.post('/families/{family_id}/visit-consent')
def update_visit_consent(family_id: str, data: VisitConsentIn, db: Session=Depends(get_db), user: User=Depends(admin)):
    family=db.get(Family,family_id)
    if not family or family.status!='active': raise HTTPException(404,'Family not found')
    family.visit_consent=data.consent
    family.visit_consent_source=data.source
    family.visit_consent_ref=data.evidence_ref
    family.consent_updated_at=utcnow()
    db.add(FamilyConsentAudit(family_id=family_id,consent=data.consent,source=data.source,
                              evidence_ref=data.evidence_ref,staff_user_id=user.id))
    db.commit()
    return {'family_id':family.id,'visit_consent':family.visit_consent}

@router.post('/families/{family_id}/members', status_code=201)
def add_family_member(family_id: str,data: FamilyMemberIn,db: Session=Depends(get_db),user: User=Depends(admin)):
    family = db.get(Family,family_id); person = db.get(Devotee,data.devotee_id)
    if not family or family.status != 'active' or not person or person.status != 'active': raise HTTPException(404,'Active family or devotee not found')
    if db.scalar(select(FamilyMember.id).where(FamilyMember.family_id==family_id,FamilyMember.devotee_id==person.id,FamilyMember.end_at.is_(None))):
        raise HTTPException(409,'Already an active member of this family')
    membership=FamilyMember(family_id=family_id,devotee_id=person.id,relationship=data.relationship,is_primary_contact=data.is_primary_contact)
    db.add(membership);db.commit()
    return {'id':membership.id,'family_id':family_id,'devotee_id':person.id}

@router.post('/addresses', status_code=201)
def upsert_address(data: AddressIn, db: Session=Depends(get_db),user: User=Depends(admin)):
    key = address_key(data)
    existing = db.scalar(select(Address).where(Address.canonical_key==key))
    if existing: return {**address_view(existing),'reused':True}
    a = Address(canonical_key=key,**data.model_dump())
    db.add(a);db.commit()
    return {**address_view(a),'reused':False}

@router.get('/addresses')
def list_addresses(db: Session=Depends(get_db),user: User=Depends(admin)):
    return [address_view(a) for a in db.scalars(select(Address).order_by(Address.city,Address.locality).limit(200))]

@router.post('/devotees/{devotee_id}/addresses')
def link_devotee_address(devotee_id:str,data:AddressLink,db:Session=Depends(get_db),user:User=Depends(admin)):
    if not db.get(Devotee,devotee_id) or not db.get(Address,data.address_id): raise HTTPException(404,'Devotee/address not found')
    row=db.scalar(select(DevoteeAddress).where(DevoteeAddress.devotee_id==devotee_id,DevoteeAddress.address_id==data.address_id,DevoteeAddress.address_type=='home'))
    if not row: db.add(DevoteeAddress(devotee_id=devotee_id,address_id=data.address_id))
    db.commit()
    return {'ok':True}

@router.post('/families/{family_id}/addresses')
def link_family_address(family_id:str,data:AddressLink,db:Session=Depends(get_db),user:User=Depends(admin)):
    if not db.get(Family,family_id) or not db.get(Address,data.address_id): raise HTTPException(404,'Family/address not found')
    row=db.scalar(select(FamilyAddress).where(FamilyAddress.family_id==family_id,FamilyAddress.address_id==data.address_id))
    if not row: db.add(FamilyAddress(family_id=family_id,address_id=data.address_id))
    db.commit()
    return {'ok':True}

@router.patch('/addresses/{address_id}/verify')
def verify_address(address_id:str,data:GeoVerify,db:Session=Depends(get_db),user:User=Depends(admin)):
    address=db.get(Address,address_id)
    if not address: raise HTTPException(404,'Address not found')
    address.latitude=data.latitude;address.longitude=data.longitude
    address.geo_accuracy_m=data.accuracy_m;address.geo_source=data.source
    address.verified=True;address.verified_by_id=user.id;address.verified_at=utcnow()
    db.commit()
    return address_view(address)

@router.get('/dedup/candidates')
def candidates(status:str='pending',db:Session=Depends(get_db),user:User=Depends(admin)):
    query=select(DuplicateCandidate).where(DuplicateCandidate.status==status).order_by(DuplicateCandidate.score.desc()).limit(200)
    return [{'id':c.id,'score':c.score,'reasons':c.reasons,'status':c.status,
             'devotee_a':person_view(db.get(Devotee,c.devotee_a_id)),
             'devotee_b':person_view(db.get(Devotee,c.devotee_b_id))} for c in db.scalars(query)]

@router.get('/dedup/audit')
def merge_audits(db:Session=Depends(get_db),user:User=Depends(admin)):
    return [{'id':x.id,'candidate_id':x.candidate_id,'survivor_id':x.survivor_id,
             'absorbed_id':x.absorbed_id,'actor_id':x.actor_id,'explanation':x.explanation,
             'happened_at':x.happened_at.isoformat()} for x in db.scalars(select(MergeAudit).order_by(MergeAudit.happened_at.desc()).limit(100))]

@router.get('/dedup/rules')
def get_dedup_rules(db:Session=Depends(get_db),user:User=Depends(admin)):
    rule=db.scalar(select(DedupRule).where(DedupRule.name=='review_threshold'))
    return {'review_threshold':rule.threshold_score if rule and rule.active else 40,
            'configured':bool(rule),'description':'Conservative review threshold; never an automatic merge.'}

@router.post('/dedup/rules/review-threshold')
def configure_dedup_threshold(score:float=Query(ge=40,le=100),db:Session=Depends(get_db),user:User=Depends(require_roles('super_admin'))):
    rule=db.scalar(select(DedupRule).where(DedupRule.name=='review_threshold'))
    if not rule: rule=DedupRule(name='review_threshold');db.add(rule)
    rule.threshold_score=score;rule.active=True
    db.commit()
    return {'review_threshold':score}

@router.get('/dedup/decisions')
def decision_audit(db:Session=Depends(get_db),user:User=Depends(admin)):
    return [{'candidate_id':x.candidate_id,'decision':x.decision,'reason':x.reason,
             'actor_id':x.actor_id,'survivor_id':x.survivor_id,'happened_at':x.happened_at.isoformat()}
            for x in db.scalars(select(DuplicateDecision).order_by(DuplicateDecision.happened_at.desc()).limit(100))]

@router.post('/dedup/scan')
def rescan(db:Session=Depends(get_db),user:User=Depends(admin)):
    count=0
    for devotee in db.scalars(select(Devotee).where(Devotee.status=='active').limit(5000)).all(): count += len(scan_person(db,devotee))
    db.commit()
    return {'new_candidates':count,'scan_limit':5000}

@router.post('/dedup/candidates/{candidate_id}/decision')
def review(candidate_id:str,data:DecisionIn,db:Session=Depends(get_db),user:User=Depends(admin)):
    candidate=db.get(DuplicateCandidate,candidate_id)
    if not candidate: raise HTTPException(404,'Candidate not found')
    if candidate.status!='pending': raise HTTPException(409,'Already decided')
    if data.decision not in {'merge','reject','related','not_sure'}: raise HTTPException(422,'Invalid decision')
    if data.decision=='merge':
        if not data.confirmed_same_person: raise HTTPException(422,'Explicit same-person confirmation is required')
        if data.survivor_devotee_id not in {candidate.devotee_a_id,candidate.devotee_b_id}: raise HTTPException(422,'Survivor must be one of the candidate devotees')
        other = candidate.devotee_b_id if data.survivor_devotee_id==candidate.devotee_a_id else candidate.devotee_a_id
        merge_devotees(db,candidate,db.get(Devotee,data.survivor_devotee_id),db.get(Devotee,other),user.id,data.reason)
    else: candidate.status='pending' if data.decision=='not_sure' else data.decision
    db.add(DuplicateDecision(candidate_id=candidate.id,actor_id=user.id,decision=data.decision,
                             reason=data.reason,survivor_id=data.survivor_devotee_id if data.decision=='merge' else None))
    candidate.reviewed_by_id=user.id;candidate.reviewed_at=utcnow()
    db.commit()
    return {'id':candidate.id,'status':candidate.status}
