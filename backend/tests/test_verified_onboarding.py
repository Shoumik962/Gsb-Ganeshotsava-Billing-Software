"""New v6 identity verification, address matching, household benefits and delivery tests."""
import re
from unittest.mock import patch
from sqlalchemy import select
from app.database import SessionLocal
from app.models import (Address,DevoteeAddress,Family,FamilyAddress,FamilyMember,FamilyLinkRequest,
                        HouseholdBenefit,ReceiptDelivery,User)
from test_admin_booking_accounts import register

BASE={'unit':'101','building':'Shree Ganesh Residency','street':'Main Street',
      'locality':'Wadala','city':'Mumbai','state':'Maharashtra','pincode':'400037'}

def data(username, phone='9876500001', address=None):
    return {'username':username,'password':'SecureExamplePass123!','email':username+'@example.invalid',
            'full_name':'Ravi Pai','phone':phone,'gotra':'Kashyapa','nakshatra':'Rohini',
            'address':address or BASE,'receipt_sms_opt_in':True}

def test_mandatory_address_verification_and_profile(client):
    payload=data('newdevotee')
    assert client.post('/api/auth/register',json={k:v for k,v in payload.items() if k!='address'}).status_code==422
    messages={}
    with patch('app.verification.send_email',lambda to,code:messages.update(email=code)),\
         patch('app.verification.send_sms',lambda to,msg:messages.update(phone=re.search(r'code: (\d{6})',msg).group(1))):
        created=client.post('/api/auth/register',json=payload)
    assert created.status_code==201,created.text
    assert client.post('/api/auth/login',json={'username':'newdevotee','password':payload['password']}).status_code==403
    assert client.post('/api/auth/register',json=payload).status_code==409  # same email/username
    wrong={'username':'newdevotee','password':payload['password'],'channel':'email','code':'000000'}
    # A guessed code must not pass (retry a different guess in the astronomically unlikely coincidence).
    if wrong['code']==messages['email']:wrong['code']='111111'
    assert client.post('/api/auth/verify',json=wrong).status_code==400
    for channel in ('phone','email'):
        response=client.post('/api/auth/verify',json={**wrong,'channel':channel,'code':messages[channel]})
        assert response.status_code==200,response.text
    login=client.post('/api/auth/login',json={'username':'newdevotee','password':payload['password']})
    assert login.status_code==200
    headers={'Authorization':'Bearer '+login.json()['access_token']}
    before=client.get('/api/account/me',headers=headers).json()
    assert before['profile_completed'] is False and before['gotra']=='Kashyapa' and before['nakshatra']=='Rohini'
    done=client.post('/api/account/complete-profile',headers=headers,json={'gotra':'Kashyapa','nakshatra':'Rohini',
                                                                           'receipt_sms_opt_in':True})
    assert done.status_code==200 and done.json()['family_id'].startswith('FAM-')
    after=client.get('/api/account/me',headers=headers).json()
    assert after['profile_completed'] and after['family_id']==done.json()['family_id']
    assert after['address']['unit']=='101'
    with SessionLocal() as db:
        assert db.query(Address).count()==1
        assert db.query(DevoteeAddress).count()==1
        assert db.query(Family).count()==1

def test_90_percent_address_confirmation_and_family_link(client,auth):
    h1,_=register(client,idx=50,phone='9012345671',full_name='First Pai')
    near={**BASE,'unit':'Flat no 101','building':'QA Building','street':'QA Test Road','locality':'QA Locality'}
    # QA registered address uses 101 / QA Building / QA Test Road / QA Locality.
    search=client.post('/api/addresses/matches',json={'address':near})
    assert search.status_code==200,search.text
    found=search.json()['matches']
    assert found and found[0]['score']>=90
    assert 'family' not in str(found).lower() and 'phone' not in str(found).lower()
    payload=data('nextperson','9012345672',near)
    blocked=client.post('/api/auth/register',json=payload)
    assert blocked.status_code==409 and blocked.json()['detail']['code']=='address_match_requires_confirmation'
    payload['selected_address_id']=found[0]['address_id']
    messages={}
    with patch('app.verification.send_email',lambda _,code:messages.update(email=code)),\
         patch('app.verification.send_sms',lambda _,msg:messages.update(phone=re.search(r'code: (\d{6})',msg).group(1))):
        result=client.post('/api/auth/register',json=payload)
    assert result.status_code==201,result.text
    assert result.json()['address_reused']
    with SessionLocal() as db:assert db.query(Address).count()==1
    for channel in ('phone','email'):
        assert client.post('/api/auth/verify',json={'username':'nextperson','password':payload['password'],
                                                     'channel':channel,'code':messages[channel]}).status_code==200
    token=client.post('/api/auth/login',json={'username':'nextperson','password':payload['password']}).json()['access_token']
    h2={'Authorization':'Bearer '+token}
    complete=client.post('/api/account/complete-profile',headers=h2,json={'gotra':'Kashyapa',
        'nakshatra':'Rohini','request_family_link':True})
    assert complete.status_code==200 and complete.json()['family_link_pending']
    assert complete.json()['family_id'] is None
    requests=client.get('/api/admin/family-link-requests',headers=auth).json()
    assert len(requests)==1
    decided=client.post(f"/api/admin/family-link-requests/{requests[0]['id']}/decision",headers=auth,
                        json={'approve':True,'relationship':'child'})
    assert decided.status_code==200,decided.text
    assert client.get('/api/account/me',headers=h2).json()['family_id']==client.get('/api/account/me',headers=h1).json()['family_id']


def test_household_one_voucher_and_distinct_benefit(client,auth):
    headers,_=register(client,idx=51,phone='9012345681',full_name='First Pai')
    with SessionLocal() as db:
        family=db.scalar(select(Family))
        family_id=family.id
    one={'family_id':family_id,'event_code':'ganeshotsav-2027','benefit_type':'prasad_voucher'}
    first=client.post('/api/admin/household-benefits',headers=auth,json=one)
    assert first.status_code==201,first.text
    assert client.post('/api/admin/household-benefits',headers=auth,json=one).status_code==409
    second=client.post('/api/admin/household-benefits',headers=auth,json={**one,'benefit_type':'pooja_invitation'})
    assert second.status_code==201
    with SessionLocal() as db:
        assert db.query(HouseholdBenefit).count()==2


def test_invalid_otp_attempts_cannot_activate_account(client):
    payload=data('lockedoutperson',phone='9012345692')
    with patch('app.verification.send_email',lambda *_:None),patch('app.verification.send_sms',lambda *_:None):
        assert client.post('/api/auth/register',json=payload).status_code==201
    request={'username':payload['username'],'password':payload['password'],'channel':'phone','code':'123456'}
    for _ in range(5):assert client.post('/api/auth/verify',json=request).status_code==400
    assert client.post('/api/auth/verify',json=request).status_code==429
    assert client.post('/api/auth/login',json={'username':payload['username'],'password':payload['password']}).status_code==403

def test_fuzzy_spelling_variants_still_share_one_household_voucher(client,auth):
    from app.identity import address_key
    from app.models import Devotee,Family,FamilyAddress,Address
    from app.address_matching import address_matches
    class Postal:
        unit='201';building='Vasant Residency';street='Main Road';locality='Wadala';city='Mumbai';state='Maharashtra';pincode='400037'
    with SessionLocal() as db:
        ids=[]
        for i,unit in enumerate(('201','Flat No 201')):
            postal=Postal();postal.unit=unit
            address=Address(canonical_key=address_key(postal),unit=unit,building=postal.building,street=postal.street,
                            locality=postal.locality,city=postal.city,state=postal.state,pincode=postal.pincode)
            db.add(address);db.flush()
            person=Devotee(first_name='QA',last_name=f'Example{i}',normalized_name=f'qa example{i}')
            db.add(person);db.flush()
            family=Family(name=f'QA Household {i}',head_devotee_id=person.id)
            db.add(family);db.flush()
            db.add(FamilyAddress(family_id=family.id,address_id=address.id))
            ids.append(family.id)
        db.commit()
        assert address_matches(db,postal)[0]['score']>=90
    first=client.post('/api/admin/household-benefits',headers=auth,
                      json={'family_id':ids[0],'event_code':'FEST2027','benefit_type':'prasad_voucher'})
    second=client.post('/api/admin/household-benefits',headers=auth,
                       json={'family_id':ids[1],'event_code':'FEST2027','benefit_type':'prasad_voucher'})
    assert first.status_code==201,first.text
    assert second.status_code==409,second.text


def test_unauthorized_receipt_not_visible_to_other_devotee(client,auth,monkeypatch):
    import hashlib,hmac
    from unittest.mock import Mock
    from app import routes_payments,receipt_notifications
    monkeypatch.setenv('APP_ENV','development');monkeypatch.setenv('RAZORPAY_MODE','test')
    monkeypatch.setenv('RAZORPAY_KEY_ID','rzp_test_test');monkeypatch.setenv('RAZORPAY_KEY_SECRET','qa_secret')
    class Gateway:
        def __init__(self,*a,**kw):pass
        def __enter__(self):return self
        def __exit__(self,*a):pass
        def post(self,*a,**kw):return Mock(json=lambda:{'id':'order_qa_receipt'},raise_for_status=lambda:None)
    monkeypatch.setattr(routes_payments.httpx,'Client',Gateway)
    monkeypatch.setattr(routes_payments,'razorpay_get',lambda _: {'id':'pay_qa_receipt',
         'order_id':'order_qa_receipt','status':'captured','currency':'INR','amount':10100})
    def failed_sms(phone,message):raise RuntimeError('Temporary provider outage')
    monkeypatch.setattr(receipt_notifications,'send_sms',failed_sms)
    seva=client.post('/api/admin/sevas',headers=auth,json={'name':'Receipt SMS Test Seva','price':101,'category':'offerings'})
    h1,_=register(client,idx=60,phone='9000060001',full_name='QA Sender')
    h2,_=register(client,idx=61,phone='9000060002',full_name='QA Stranger')
    payload={'purpose':'seva','sevaIds':[seva.json()['id']],'amount':101,
             'devotee':{'name':'QA Sender','phone':'9000060001'}}
    order=client.post('/api/payments/orders',headers=h1,json=payload)
    assert order.status_code==201,order.text
    signature=hmac.new(b'qa_secret',b'order_qa_receipt|pay_qa_receipt',hashlib.sha256).hexdigest()
    verified=client.post('/api/payments/verify',json={'order_id':order.json()['order_id'],
         'razorpay_order_id':'order_qa_receipt','razorpay_payment_id':'pay_qa_receipt','razorpay_signature':signature})
    assert verified.status_code==200,verified.text
    receipt_no=verified.json()['receipt']['receiptNo']
    assert client.get('/api/account/receipts/'+receipt_no,headers=h1).status_code==200
    assert client.get('/api/account/receipts/'+receipt_no,headers=h2).status_code==404
    with SessionLocal() as db:
        delivery=db.scalar(select(ReceiptDelivery))
        assert delivery.status=='failed' and delivery.attempts==1
    # Failed SMS did not rollback captured payment or the unique receipt.
    assert client.get('/api/account/bookings',headers=h1).json()[0]['receipt_no']==receipt_no
