"""One-time email and phone verification with expiring, hashed challenge codes.

For local QA, explicit console providers print OTP to the backend console only. They
must never be used in production. Production integrates SMTP + Twilio SMS.
"""
import hashlib
import hmac
import logging
import os
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
import httpx
from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from .models import User, Devotee, VerificationChallenge, utcnow

log=logging.getLogger(__name__)

def digest(user_id:str,channel:str,code:str)->str:
    secret=os.getenv('JWT_SECRET','')
    if len(secret)<32: raise RuntimeError('JWT_SECRET must be configured')
    return hmac.new(secret.encode(),f'{user_id}:{channel}:{code}'.encode(),hashlib.sha256).hexdigest()

def mode(name:str)->str:
    value=os.getenv(name,'disabled').strip().lower()
    if value not in {'disabled','console','smtp','twilio'}: raise RuntimeError(f'Unsupported {name} provider')
    if value=='console' and os.getenv('APP_ENV','development').lower()!='development':
        raise RuntimeError('Console OTP not allowed outside local development')
    return value

def send_email(destination:str,code:str):
    provider=mode('EMAIL_PROVIDER')
    if provider=='console':
        print(f'[DEV EMAIL OTP] for {destination}: {code}',flush=True)
    elif provider=='smtp':
        msg=EmailMessage()
        msg['Subject']='Wadala Ganeshotsav email verification'
        msg['From']=os.environ['SMTP_FROM']
        msg['To']=destination
        msg.set_content(f'Your email verification code is {code}. It expires in 10 minutes. Do not share it.')
        with smtplib.SMTP(os.environ['SMTP_HOST'],int(os.getenv('SMTP_PORT','587')),timeout=12) as server:
            server.starttls();server.login(os.environ['SMTP_USER'],os.environ['SMTP_PASSWORD']);server.send_message(msg)
    else:
        raise RuntimeError('EMAIL_PROVIDER is not configured')

def send_sms(phone:str,message:str):
    provider=mode('SMS_PROVIDER')
    if provider=='console':
        print(f'[DEV SMS] to +91{phone}: {message}',flush=True)
        return 'local-console'
    if provider=='twilio':
        sid=os.environ['TWILIO_ACCOUNT_SID']; token=os.environ['TWILIO_AUTH_TOKEN']
        with httpx.Client(timeout=12) as client:
            response=client.post(f'https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json',
                data={'To':'+91'+phone,'From':os.environ['TWILIO_FROM_NUMBER'],'Body':message},auth=(sid,token))
            response.raise_for_status()
            return response.json().get('sid','provider-accepted')
    raise RuntimeError('SMS_PROVIDER is not configured')

def send_code(db:Session,user:User,channel:str):
    if channel not in ('email','phone'):raise HTTPException(422,'Invalid verification channel')
    verified=user.email_verified if channel=='email' else user.phone_verified
    if verified:return {'already_verified':True}
    now=utcnow()
    prior=db.scalars(select(VerificationChallenge).where(VerificationChallenge.user_id==user.id,
        VerificationChallenge.channel==channel).order_by(VerificationChallenge.created_at.desc())).all()
    if prior:
        since=(now-_aware(prior[0].created_at)).total_seconds()
        if since<60:raise HTTPException(429,'Please wait 60 seconds before requesting another code')
        if sum(1 for c in prior if (now-_aware(c.created_at)).total_seconds()<3600)>=5:
            raise HTTPException(429,'Too many verification requests; retry later')
    code=f'{secrets.randbelow(1_000_000):06d}'
    challenge=VerificationChallenge(user_id=user.id,channel=channel,code_digest=digest(user.id,channel,code),
                                    expires_at=now+timedelta(minutes=10))
    db.add(challenge);db.commit()
    try:
        if channel=='email': send_email(user.email,code)
        else:
            person=db.get(Devotee,user.devotee_id)
            send_sms(person.phone,f'Wadala Ganeshotsav verification code: {code}. Expires in 10 minutes. Do not share it.')
    except Exception as exc:
        log.warning('Verification delivery unavailable for %s: %s',channel,type(exc).__name__)
        # Rotate unusable challenge, allowing resend after support fixes provider configuration.
        db.delete(challenge);db.commit()
        raise HTTPException(503,f'{channel.capitalize()} verification delivery is unavailable; check provider configuration')
    return {'sent':True,'expires_in_seconds':600}

def _aware(dt:datetime)->datetime:
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt

def verify_code(db:Session,user:User,channel:str,code:str):
    if channel not in ('email','phone') or not (len(code)==6 and code.isascii() and code.isdigit()):
        raise HTTPException(422,'Enter a six-digit verification code')
    current=db.scalar(select(VerificationChallenge).where(VerificationChallenge.user_id==user.id,
        VerificationChallenge.channel==channel,VerificationChallenge.consumed_at.is_(None))
        .order_by(VerificationChallenge.created_at.desc()))
    if not current or _aware(current.expires_at)<utcnow():raise HTTPException(400,'Code expired; request a new one')
    if current.attempts>=5:raise HTTPException(429,'Too many incorrect attempts; request a new code')
    current.attempts+=1
    if not hmac.compare_digest(current.code_digest,digest(user.id,channel,code)):
        db.commit();raise HTTPException(400,'Incorrect code')
    verified_at=utcnow()
    for outstanding in db.scalars(select(VerificationChallenge).where(
            VerificationChallenge.user_id==user.id,VerificationChallenge.channel==channel,
            VerificationChallenge.consumed_at.is_(None))).all():
        outstanding.consumed_at=verified_at
    if channel=='email':user.email_verified=True
    else:user.phone_verified=True
    db.commit()
    return {'verified':True,'email_verified':user.email_verified,'phone_verified':user.phone_verified}
