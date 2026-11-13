"""Consent-gated geospatial household discovery and assigned visit log."""
from datetime import timedelta
from math import radians, sin, cos, atan2, sqrt
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from .database import get_db
from .models import (Address, Family, FamilyAddress, Sevadar, SevadarLocation,
                     User, VisitAssignment, VisitLog, utcnow)
from .schemas import AssignmentIn, GPSIn, VisitIn
from .security import require_roles
from .identity import normalize

router=APIRouter(prefix='/api/sevadars',tags=['field operations'])

def haversine_km(lat1:float,lon1:float,lat2:float,lon2:float)->float:
    delta_lat=radians(lat2-lat1);delta_lon=radians(lon2-lon1)
    a=sin(delta_lat/2)**2 + cos(radians(lat1))*cos(radians(lat2))*sin(delta_lon/2)**2
    return 6371.0088*2*atan2(sqrt(a),sqrt(max(0,1-a)))

def get_sevadar(db:Session,user:User)->Sevadar:
    person=db.scalar(select(Sevadar).where(Sevadar.user_id==user.id,Sevadar.active==True))
    if not person: raise HTTPException(403,'Active sevadar profile required')
    return person

def location_or_fail(db:Session,sevadar:Sevadar)->SevadarLocation:
    point=db.get(SevadarLocation,sevadar.id)
    if not sevadar.location_consent or not point:
        raise HTTPException(409,'Share your GPS location explicitly to search nearby visits')
    if not point.updated_at or (utcnow()-point.updated_at.replace(tzinfo=point.updated_at.tzinfo or __import__('datetime').timezone.utc))>timedelta(minutes=15):
        db.delete(point)
        sevadar.location_consent=False
        db.commit()
        raise HTTPException(409,'Location expired; share current location again')
    return point

def near_home(db:Session,sevadar:Sevadar, radius_km:float=5,limit:int=25):
    point=location_or_fail(db,sevadar)
    # Latitude/longitude bounding box keeps PostgreSQL queries bounded; exact distance via Haversine.
    lat_box=radius_km/111.2
    lon_box=radius_km/max(1,111.2*cos(radians(point.latitude)))
    rows=db.execute(select(Family,Address).join(FamilyAddress,FamilyAddress.family_id==Family.id)
                    .join(Address,Address.id==FamilyAddress.address_id)
                    .where(Family.status=='active',Family.visit_consent==True,FamilyAddress.current==True,
                           Address.verified==True,Address.latitude.is_not(None),Address.longitude.is_not(None),
                           Address.latitude.between(point.latitude-lat_box,point.latitude+lat_box),
                           Address.longitude.between(point.longitude-lon_box,point.longitude+lon_box))
                    .order_by(func.abs(Address.latitude-point.latitude)+func.abs(Address.longitude-point.longitude)).limit(500)).all()
    output=[];seen=set()
    for family,address in rows:
        if sevadar.zone and normalize(sevadar.zone) not in normalize(f'{address.locality} {address.city} {address.street}'):
            continue
        distance=haversine_km(point.latitude,point.longitude,address.latitude,address.longitude)
        if distance>radius_km or (family.id,address.id) in seen: continue
        seen.add((family.id,address.id))
        output.append({'family_id':family.id,'family_code':family.family_code,'family_name':family.name,
                       'address_id':address.id,'address':', '.join(s for s in [address.unit,address.building,address.street,address.locality,address.city,address.pincode] if s),
                       'latitude':address.latitude,'longitude':address.longitude,
                       'distance_km':round(distance,2)})
    return sorted(output,key=lambda x:x['distance_km'])[:limit]

@router.post('/me/location')
def update_location(data:GPSIn,db:Session=Depends(get_db),user:User=Depends(require_roles('sevadar','admin','super_admin'))):
    worker=get_sevadar(db,user)
    if not data.consent: raise HTTPException(422,'Explicit GPS consent required')
    worker.location_consent=True
    record=db.get(SevadarLocation,worker.id)
    if record is None: record=SevadarLocation(sevadar_id=worker.id,latitude=data.latitude,longitude=data.longitude,accuracy_m=data.accuracy_m);db.add(record)
    record.latitude=data.latitude;record.longitude=data.longitude;record.accuracy_m=data.accuracy_m;record.updated_at=utcnow()
    db.commit()
    return {'ok':True,'expires_in_minutes':15}

@router.delete('/me/location')
def stop_location(db:Session=Depends(get_db),user:User=Depends(require_roles('sevadar','admin','super_admin'))):
    worker=get_sevadar(db,user)
    record=db.get(SevadarLocation,worker.id)
    if record: db.delete(record)
    worker.location_consent=False;db.commit()
    return {'ok':True}

@router.get('/me/nearby')
def nearby(radius_km:float=Query(default=3,gt=0,le=10),limit:int=Query(default=25,ge=1,le=50),
           db:Session=Depends(get_db),user:User=Depends(require_roles('sevadar','admin','super_admin'))):
    return near_home(db,get_sevadar(db,user),radius_km,limit)

@router.post('/me/assignments',status_code=201)
def claim(data:AssignmentIn,db:Session=Depends(get_db),user:User=Depends(require_roles('sevadar','admin','super_admin'))):
    worker=get_sevadar(db,user)
    eligible={(x['family_id'],x['address_id']):x for x in near_home(db,worker,5,100)}
    candidate=eligible.get((data.family_id,data.address_id))
    if not candidate: raise HTTPException(403,'Household is not consented/verified/in your active zone and GPS radius')
    existing=db.scalar(select(VisitAssignment).where(VisitAssignment.sevadar_id==worker.id,VisitAssignment.family_id==data.family_id,
                                                      VisitAssignment.address_id==data.address_id,VisitAssignment.status=='assigned'))
    if existing: return {'id':existing.id,'status':existing.status,'reused':True}
    assignment=VisitAssignment(sevadar_id=worker.id,family_id=data.family_id,address_id=data.address_id,
                               distance_km=candidate['distance_km'],purpose=data.purpose)
    db.add(assignment);db.commit()
    return {'id':assignment.id,'status':assignment.status,'reused':False}

@router.get('/me/assignments')
def assignments(db:Session=Depends(get_db),user:User=Depends(require_roles('sevadar','admin','super_admin'))):
    worker=get_sevadar(db,user)
    entries=db.scalars(select(VisitAssignment).where(VisitAssignment.sevadar_id==worker.id).order_by(VisitAssignment.assigned_at.desc()).limit(100)).all()
    return [{'id':x.id,'family_id':x.family_id,'address_id':x.address_id,'status':x.status,'purpose':x.purpose,'distance_km':x.distance_km} for x in entries]

@router.post('/me/assignments/{assignment_id}/visits',status_code=201)
def visit(assignment_id:str,data:VisitIn,db:Session=Depends(get_db),user:User=Depends(require_roles('sevadar','admin','super_admin'))):
    worker=get_sevadar(db,user);assignment=db.get(VisitAssignment,assignment_id)
    if not assignment or assignment.sevadar_id!=worker.id: raise HTTPException(404,'Assignment not found')
    if data.outcome not in {'completed','not_home','reschedule','declined'}: raise HTTPException(422,'Invalid outcome')
    if assignment.status != 'assigned': raise HTTPException(409,'Assignment already closed')
    family=db.get(Family,assignment.family_id)
    if not family or not family.visit_consent: raise HTTPException(409,'Visit consent was withdrawn')
    row=VisitLog(assignment_id=assignment.id,outcome=data.outcome,notes=data.notes)
    db.add(row);assignment.status='completed' if data.outcome=='completed' else data.outcome
    db.commit()
    return {'visit_id':row.id,'assignment_status':assignment.status}
