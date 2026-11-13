"""E2E API integration tests using isolated SQLite; same Alembic schema is also migrated separately."""
from sqlalchemy import select
from app.database import SessionLocal
from app.models import (AdminAudit, Devotee, DuplicateCandidate, PaymentOrder, Receipt, SevaBooking, SevaMaster, User)

def register(client, idx=1, phone='9000000101', full_name='QA Devotee One'):
    data={'username':f'qadev{idx}','password':'ExampleTestPass123!', 'email':f'qa{idx}@example.invalid',
          'full_name':full_name,'phone':phone}
    res=client.post('/api/auth/register',json=data)
    assert res.status_code==201,res.text
    token=client.post('/api/auth/login',json={'username':data['username'],'password':data['password']}).json()['access_token']
    return {'Authorization':f'Bearer {token}'},res.json()

def test_complete_admin_seva_demo_booking_receipt(client,auth,monkeypatch):
    monkeypatch.setenv('APP_ENV','development');monkeypatch.setenv('RAZORPAY_MODE','test')
    monkeypatch.setenv('ENABLE_DEMO_CHECKOUT','1')
    created=client.post('/api/admin/sevas',headers=auth,json={'name':'TEST Ganesh Archana','price':101,'category':'offerings','timing':'10:00 AM'})
    assert created.status_code==201,created.text
    seva_id=created.json()['id']
    catalog=client.get('/api/sevas').json()
    assert [x['id'] for x in catalog]==[seva_id]
    headers,person=register(client)
    assert person['devotee_code'].startswith('DEV-')
    checkout={'purpose':'seva','sevaIds':[seva_id],'amount':101,
              'devotee':{'name':'QA Devotee One','phone':'9000000101','preferredDate':'2026-11-22','email':'qa1@example.invalid'}}
    result=client.post('/api/payments/demo-checkout',headers=headers,json=checkout)
    assert result.status_code==201,result.text
    receipt=result.json()['receipt']
    assert receipt['receiptNo'].startswith('DEMO-RCP-')
    assert receipt['status']=='DEMO ONLY — NO PAYMENT'
    assert receipt['isDemo'] and receipt['isTest']
    assert receipt['total']==101 and receipt['items'][0]['name']=='TEST Ganesh Archana'
    # Public receipt retrieval still requires matching phone + full receipt code.
    assert client.post('/api/receipts/lookup',json={'receipt_no':receipt['receiptNo'],'phone':'9000000101'}).status_code==200
    assert client.post('/api/receipts/lookup',json={'receipt_no':receipt['receiptNo'],'phone':'9000000102'}).status_code==404
    bookings=client.get('/api/account/bookings',headers=headers).json()
    assert len(bookings)==1 and bookings[0]['status']=='demo'
    assert bookings[0]['receipt_no']==receipt['receiptNo']
    admin_orders=client.get('/api/admin/bookings',headers=auth).json()
    assert len(admin_orders)==1 and admin_orders[0]['gateway_mode']=='demo'
    with SessionLocal() as db:
        assert db.query(SevaBooking).count()==1
        assert db.query(Receipt).count()==1
        assert db.query(PaymentOrder).first().status=='demo'
    # Edit current price; historical receipt must preserve original snapshot.
    updated=client.patch(f'/api/admin/sevas/{seva_id}',headers=auth,json={'price':201})
    assert updated.status_code==200,updated.text
    assert client.get('/api/sevas').json()[0]['price']==201
    preserved=client.post('/api/receipts/lookup',json={'receipt_no':receipt['receiptNo'],'phone':'9000000101'}).json()
    assert preserved['items'][0]['price']==101 and preserved['total']==101
    wrong=client.post('/api/payments/demo-checkout',headers=headers,json=checkout)
    assert wrong.status_code==409
    assert client.get('/api/admin/audit',headers=auth).json()

def test_public_cannot_change_catalog_or_elevate_role(client,auth):
    user,_=register(client)
    assert client.post('/api/admin/sevas',headers=user,json={'name':'Fake seva','category':'offerings','price':1}).status_code==403
    assert client.patch('/api/admin/site/settings',headers=user,json={'booking_enabled':False}).status_code==403
    assert client.post('/api/auth/register',json={'username':'admininjection','password':'ExampleTestPass123!',
        'full_name':'Fake Person','email':'fake@example.invalid','phone':'9000000101','role':'super_admin'}).status_code==422
    assert client.get('/api/admin/users',headers=user).status_code==403
    assert client.get('/api/admin/users',headers=auth).status_code==200

def test_multiple_accounts_and_duplicate_review_not_merged(client):
    h1,r1=register(client,1,phone='9000000101',full_name='QA Devotee One')
    h2,r2=register(client,2,phone='9000000101',full_name='QA Devotee Two')
    h3,r3=register(client,3,phone='9000000101',full_name='QA Devotee One')
    assert len({r1['devotee_code'],r2['devotee_code'],r3['devotee_code']})==3
    with SessionLocal() as db:
        assert db.query(User).filter(User.role=='devotee').count()==3
        assert db.query(Devotee).count()==3
        assert db.query(DuplicateCandidate).count()>=1
    # A devotee can only access their own booking history.
    assert client.get('/api/account/bookings',headers=h1).json()==[]
    assert client.get('/api/account/bookings',headers=h2).json()==[]

def test_disabled_seva_site_switch_and_demo_protection(client,auth,monkeypatch):
    monkeypatch.setenv('APP_ENV','development');monkeypatch.setenv('RAZORPAY_MODE','test')
    monkeypatch.setenv('ENABLE_DEMO_CHECKOUT','1')
    h,_=register(client)
    data={'purpose':'seva','amount':101,'sevaIds':['qa-seva'],
          'devotee':{'name':'QA Devotee One','phone':'9000000101'}}
    created=client.post('/api/admin/sevas',headers=auth,json={'id':'qa-seva','name':'QA Seva','price':101,'category':'major'})
    assert created.status_code==201
    client.patch('/api/admin/sevas/qa-seva',headers=auth,json={'active':False})
    assert client.get('/api/sevas').json()==[]
    assert client.post('/api/payments/demo-checkout',headers=h,json=data).status_code==422
    client.patch('/api/admin/sevas/qa-seva',headers=auth,json={'active':True})
    disabled=client.patch('/api/admin/site/settings',headers=auth,json={'booking_enabled':False})
    assert disabled.status_code==200
    assert client.post('/api/payments/demo-checkout',headers=h,json=data).status_code==403
    client.patch('/api/admin/site/settings',headers=auth,json={'booking_enabled':True})
    monkeypatch.setenv('APP_ENV','production')
    assert client.get('/api/payments/config').json()['demoCheckoutEnabled'] is False
    assert client.post('/api/payments/demo-checkout',headers=h,json=data).status_code==404

def test_superadmin_staff_user_lifecycle(client,auth):
    data={'username':'qa_staff','password':'TestPass123456','role':'sevadar','zone':'Wadala'}
    result=client.post('/api/admin/users',headers=auth,json=data)
    assert result.status_code==201,result.text
    staff_id=result.json()['id']
    users=client.get('/api/admin/users',headers=auth).json()
    assert any(u['id']==staff_id and u['role']=='sevadar' for u in users)
    disabled=client.patch(f'/api/admin/users/{staff_id}/status',headers=auth,json={'active':False})
    assert disabled.status_code==200
    assert client.post('/api/auth/login',json={'username':'qa_staff','password':'TestPass123456'}).status_code==401

def test_verified_razorpay_test_seva_booking_creates_confirmed_booking(client,auth,monkeypatch):
    """Mocked gateway transport; checks the actual Razorpay signature/capture verification logic."""
    from unittest.mock import Mock
    import hashlib,hmac
    from app import routes_payments
    monkeypatch.setenv('APP_ENV','development')
    monkeypatch.setenv('RAZORPAY_MODE','test')
    monkeypatch.setenv('RAZORPAY_KEY_ID','rzp_test_qa')
    monkeypatch.setenv('RAZORPAY_KEY_SECRET','qa_razorpay_secret')
    class FakeGateway:
        def __init__(self,*args,**kwargs):pass
        def __enter__(self):return self
        def __exit__(self,*args):pass
        def post(self,*args,**kwargs):return Mock(json=lambda:{'id':'order_seva_test_123'},raise_for_status=lambda:None)
    monkeypatch.setattr(routes_payments.httpx,'Client',FakeGateway)
    created=client.post('/api/admin/sevas',headers=auth,json={'id':'verified-qa-seva','name':'Verified QA Seva',
         'category':'offerings','price':251})
    assert created.status_code==201
    headers,_=register(client)
    payload={'purpose':'seva','sevaIds':['verified-qa-seva'],'amount':251,
             'devotee':{'name':'QA Devotee One','phone':'9000000101'}}
    order=client.post('/api/payments/orders',headers=headers,json=payload)
    assert order.status_code==201,order.text
    with SessionLocal() as db:
        assert db.query(SevaBooking).first().status=='awaiting_payment'
        assert db.query(Receipt).count()==0
    signature=hmac.new(b'qa_razorpay_secret',b'order_seva_test_123|pay_seva_123',hashlib.sha256).hexdigest()
    verify={'order_id':order.json()['order_id'],'razorpay_order_id':'order_seva_test_123',
            'razorpay_payment_id':'pay_seva_123','razorpay_signature':signature}
    bad=client.post('/api/payments/verify',json={**verify,'razorpay_signature':'forged'})
    assert bad.status_code==400
    monkeypatch.setattr(routes_payments,'razorpay_get',lambda _: {'id':'pay_seva_123',
         'order_id':'order_seva_test_123','status':'captured','currency':'INR','amount':25100})
    confirmed=client.post('/api/payments/verify',json=verify)
    assert confirmed.status_code==200,confirmed.text
    receipt=confirmed.json()['receipt']
    assert receipt['receiptNo'].startswith('TEST-RCP-') and receipt['isTest']
    assert receipt['isDemo'] is False and receipt['items'][0]['price']==251
    assert client.post('/api/payments/verify',json=verify).json()['receipt']['receiptNo']==receipt['receiptNo']
    with SessionLocal() as db:
        assert db.query(SevaBooking).first().status=='confirmed'
        assert db.query(PaymentOrder).first().status=='paid'
        assert db.query(Receipt).count()==1
    assert client.get('/api/account/bookings',headers=headers).json()[0]['receipt_no']==receipt['receiptNo']


def test_admin_upload_image(client, auth):
    from pathlib import Path
    upload_dir = Path(__file__).resolve().parents[2] / 'frontend' / 'src' / 'assets'
    files = {'file': ('test_deity.jpg', b'\xff\xd8\xff\xe0\x00\x10JFIFfakejpgdata', 'image/jpeg')}
    res = client.post('/api/admin/upload-image', headers=auth, files=files, data={'set_as_hero': 'false'})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body['storage'] == 'local'
    assert body['url'].startswith('/assets/')
    assert body['filename'].endswith('.jpg')

    # Clean up test artifact
    created_file = upload_dir / body['filename']
    if created_file.exists():
        created_file.unlink()

    bad_files = {'file': ('script.exe', b'binarydata', 'application/octet-stream')}
    bad_res = client.post('/api/admin/upload-image', headers=auth, files=bad_files)
    assert bad_res.status_code == 422
