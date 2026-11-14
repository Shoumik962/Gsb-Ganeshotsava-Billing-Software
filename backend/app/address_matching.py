"""Postal-address candidate discovery. A match is not proof of residence or kinship."""
from difflib import SequenceMatcher
import re
from sqlalchemy import select
from sqlalchemy.orm import Session
from .identity import normalize, address_key
from .models import Address

FIELDS = ('unit','building','street','locality','city','state','pincode')
WEIGHTS = {'unit':.34,'building':.16,'street':.16,'locality':.13,'city':.06,'state':.05,'pincode':.10}

def unit_normalize(value:str)->str:
    unit=normalize(value)
    unit=re.sub(r'\b(flat|flt|room|house|apartment|unit|no|number)\b','',unit)
    return ' '.join(unit.split())

def similarity(left, right):
    # Avoid false shared-household matches across different flats/pincodes.
    if str(left.pincode).strip() != str(right.pincode).strip(): return 0.0
    unit = SequenceMatcher(None,unit_normalize(left.unit),unit_normalize(right.unit)).ratio()
    if unit < .85: return 0.0
    score=0.0
    for field,weight in WEIGHTS.items():
        clean=unit_normalize if field=='unit' else normalize
        a=clean(str(getattr(left,field) or ''))
        b=clean(str(getattr(right,field) or ''))
        ratio = 1 if a==b else (SequenceMatcher(None,a,b).ratio() if a and b else 0)
        score += ratio * weight
    return round(100*score,1)

def address_matches(db:Session, supplied, minimum:float=90.0):
    candidates = db.scalars(select(Address).where(Address.pincode==supplied.pincode).limit(5000)).all()
    return sorted([{'address_id':a.id,'score':similarity(supplied,a),
                    'formatted':', '.join(filter(None,[a.unit,a.building,a.street,a.locality,a.city,a.state,a.pincode])),
                    'requires_confirmation':True}
                   for a in candidates if similarity(supplied,a)>=minimum],key=lambda a:-a['score'])[:5]

def choose_address(db:Session, supplied, selected_address_id:str|None, confirm_new_address:bool):
    matches=address_matches(db,supplied)
    if selected_address_id:
        a=db.get(Address,selected_address_id)
        if not a or similarity(supplied,a)<90: raise ValueError('Selected address does not match the supplied full postal address')
        return a, True
    if matches and not confirm_new_address:
        return None, matches
    key=address_key(supplied)
    found=db.scalar(select(Address).where(Address.canonical_key==key))
    if found: return found, True
    # A declaration of residence never verifies GPS or ownership.
    address=Address(canonical_key=key,**supplied.model_dump())
    db.add(address);db.flush()
    return address, False
