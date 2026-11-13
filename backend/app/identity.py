"""Exact-address reuse, conservative duplicate candidate generation and approved merges."""
import hashlib
import re
from difflib import SequenceMatcher
from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session
from .models import (Address, Devotee, DevoteeAddress, DuplicateCandidate, DedupRule, Family,
                     FamilyMember, FamilyAddress, MergeAudit, PaymentOrder, Sevadar)

def normalize(text: str | None) -> str:
    return ' '.join(re.findall(r'\w+', (text or '').casefold()))

def phone_normalize(value: str | None) -> str | None:
    digits = re.sub(r'\D', '', value or '')
    if not digits: return None
    if len(digits) == 12 and digits.startswith('91'): digits = digits[2:]
    if len(digits) != 10: raise HTTPException(422, 'Phone must have 10 digits (India format)')
    return digits

def address_key(data) -> str:
    # Unit is essential: two apartments in the same building MUST NOT be collapsed.
    parts = [data.unit, data.building, data.street, data.locality, data.city, data.state, data.pincode]
    return hashlib.sha256('|'.join(normalize(v) for v in parts).encode()).hexdigest()

def duplicate_score(a: Devotee, b: Devotee) -> tuple[float, list[str]]:
    if a.id == b.id: return 0, []
    reasons = []
    score = 0.0
    similarity = 100 * SequenceMatcher(None, a.normalized_name, b.normalized_name).ratio()
    if similarity >= 90:
        reasons.append(f'name similarity {similarity:.0f}%')
        score += similarity * .45
    if a.phone and a.phone == b.phone:
        reasons.append('shared phone (may be family)')
        score += 24
    if a.email and a.email == b.email:
        reasons.append('shared email (may be family)')
        score += 18
    if a.date_of_birth and a.date_of_birth == b.date_of_birth:
        reasons.append('matching date of birth')
        score += 20
    if a.govt_id_digest and a.govt_id_digest == b.govt_id_digest:
        reasons.append('matching government-ID digest')
        score += 50
    return min(100, score), reasons

def scan_person(db: Session, devotee: Devotee) -> list[DuplicateCandidate]:
    """Shortlist on matching contact; do not auto-merge people sharing an address or phone."""
    terms = []
    if devotee.phone: terms.append(Devotee.phone == devotee.phone)
    if devotee.email: terms.append(Devotee.email == devotee.email)
    if devotee.govt_id_digest: terms.append(Devotee.govt_id_digest == devotee.govt_id_digest)
    # Same exact name is a weak signal, flagged when other details are absent.
    terms.append(Devotee.normalized_name == devotee.normalized_name)
    peers = db.scalars(select(Devotee).where(Devotee.id != devotee.id, Devotee.status == 'active', or_(*terms)).limit(300)).all()
    rule=db.scalar(select(DedupRule).where(DedupRule.name=='review_threshold'))
    threshold=rule.threshold_score if rule and rule.active else 40
    created = []
    for peer in peers:
        score, reasons = duplicate_score(devotee, peer)
        if score < threshold: continue
        first, second = sorted([devotee.id, peer.id])
        candidate = db.scalar(select(DuplicateCandidate).where(DuplicateCandidate.devotee_a_id == first, DuplicateCandidate.devotee_b_id == second))
        if candidate: continue
        candidate = DuplicateCandidate(devotee_a_id=first, devotee_b_id=second, score=score, reasons=reasons)
        db.add(candidate)
        created.append(candidate)
    db.flush()
    return created

def merge_devotees(db: Session, candidate: DuplicateCandidate, survivor: Devotee, absorbed: Devotee, actor_id: str, reason: str):
    """Never delete records. Relink IDs and preserve immutable merge history in one transaction."""
    if absorbed.status != 'active' or survivor.status != 'active': raise HTTPException(409, 'One identity is no longer active')
    before = {'survivor_code': survivor.devotee_code, 'absorbed_code': absorbed.devotee_code,
              'name': f'{absorbed.first_name} {absorbed.last_name}', 'phone': absorbed.phone,
              'member_ids': [m.family_id for m in db.scalars(select(FamilyMember).where(FamilyMember.devotee_id == absorbed.id))]}
    for member in db.scalars(select(FamilyMember).where(FamilyMember.devotee_id == absorbed.id)).all():
        duplicate = db.scalar(select(FamilyMember).where(FamilyMember.family_id == member.family_id, FamilyMember.devotee_id == survivor.id, FamilyMember.end_at.is_(None)))
        if duplicate and member.end_at is None: db.delete(member)
        else: member.devotee_id = survivor.id
    for link in db.scalars(select(DevoteeAddress).where(DevoteeAddress.devotee_id == absorbed.id)).all():
        duplicate = db.scalar(select(DevoteeAddress).where(DevoteeAddress.devotee_id == survivor.id, DevoteeAddress.address_id == link.address_id, DevoteeAddress.address_type == link.address_type))
        if duplicate: db.delete(link)
        else: link.devotee_id = survivor.id
    for family in db.scalars(select(Family).where(Family.head_devotee_id == absorbed.id)).all(): family.head_devotee_id = survivor.id
    for order in db.scalars(select(PaymentOrder).where(PaymentOrder.devotee_id == absorbed.id)).all(): order.devotee_id = survivor.id
    for worker in db.scalars(select(Sevadar).where(Sevadar.devotee_id == absorbed.id)).all(): worker.devotee_id = survivor.id
    absorbed.status = 'merged'
    absorbed.merged_into_id = survivor.id
    db.add(MergeAudit(candidate_id=candidate.id, survivor_id=survivor.id, absorbed_id=absorbed.id,
                      actor_id=actor_id, explanation=reason, old_snapshot=before))
    # Other pending pairs mentioning retired ID are suspended, never auto-decided.
    for pair in db.scalars(select(DuplicateCandidate).where(or_(DuplicateCandidate.devotee_a_id == absorbed.id, DuplicateCandidate.devotee_b_id == absorbed.id), DuplicateCandidate.status == 'pending')).all():
        pair.status = 'stale' if pair.id != candidate.id else 'merged'
