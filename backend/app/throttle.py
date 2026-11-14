"""Database-backed local request throttle. Deploy WAF/rate limits ahead of production API."""
import hashlib
from datetime import timedelta, timezone
from fastapi import HTTPException, Request
from sqlalchemy.orm import Session
from .models import RequestThrottle, utcnow

def check_limit(db:Session,request:Request,action:str,max_events:int,window_seconds:int):
    # Do not trust a client-supplied X-Forwarded-For header.
    ip=request.client.host if request.client else 'unknown'
    identity=hashlib.sha256(f'{action}|{ip}'.encode()).hexdigest()
    row=db.get(RequestThrottle,identity,with_for_update=True)
    now=utcnow()
    if not row:
        row=RequestThrottle(id=identity,action=action,count=0,reset_at=now+timedelta(seconds=window_seconds))
        db.add(row)
    elif (row.reset_at.replace(tzinfo=timezone.utc) if row.reset_at.tzinfo is None else row.reset_at)<=now:
        row.count=0;row.reset_at=now+timedelta(seconds=window_seconds)
    if row.count>=max_events:
        db.rollback();raise HTTPException(429,'Too many requests. Please try later.')
    row.count+=1
    db.commit()  # Throttle recorded even if subsequent request validation fails.
