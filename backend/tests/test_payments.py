import hashlib
import hmac
from unittest.mock import Mock
from app.models import Receipt, PaymentOrder
from app.database import SessionLocal

def test_no_razorpay_config_no_false_receipt(client,monkeypatch):
    monkeypatch.delenv('RAZORPAY_KEY_ID',raising=False)
    monkeypatch.delenv('RAZORPAY_KEY_SECRET',raising=False)
    result=client.post('/api/payments/orders',json={'purpose':'donation','donor':{'name':'Ram','phone':'9876543210'},'amount':501})
    assert result.status_code==503
    with SessionLocal() as db:
        assert db.query(Receipt).count()==0
        assert db.query(PaymentOrder).count()==0

def test_payment_only_confirmed_after_gateway_capture(client,monkeypatch):
    monkeypatch.setenv('RAZORPAY_KEY_ID','rzp_test_test')
    monkeypatch.setenv('RAZORPAY_KEY_SECRET','testsecret')
    from app import routes_payments
    class FakeClient:
        def __init__(self,*a,**kw): pass
        def __enter__(self): return self
        def __exit__(self,*a): pass
        def post(self,*a,**kw):
            return Mock(json=lambda:{'id':'order_123'},raise_for_status=lambda:None)
    monkeypatch.setattr(routes_payments.httpx,'Client',FakeClient)
    p=client.post('/api/payments/orders',json={'purpose':'donation','donor':{'name':'Ram Pai','phone':'9876543210'},'amount':501})
    assert p.status_code==201,p.text
    order=p.json()
    with SessionLocal() as db:
        assert db.query(Receipt).count()==0
    signature=hmac.new(b'testsecret',b'order_123|pay_123',hashlib.sha256).hexdigest()
    data={'order_id':order['order_id'],'razorpay_order_id':'order_123','razorpay_payment_id':'pay_123','razorpay_signature':signature}
    bad=client.post('/api/payments/verify',json={**data,'razorpay_signature':'invalid'})
    assert bad.status_code==400
    monkeypatch.setattr(routes_payments,'razorpay_get',lambda payment_id:{'id':payment_id,'order_id':'order_123','status':'authorized','currency':'INR','amount':50100})
    pending=client.post('/api/payments/verify',json=data)
    assert pending.status_code==409
    monkeypatch.setattr(routes_payments,'razorpay_get',lambda payment_id:{'id':payment_id,'order_id':'order_123','status':'captured','currency':'INR','amount':50100})
    paid=client.post('/api/payments/verify',json=data)
    assert paid.status_code==200,paid.text
    receipt=paid.json()['receipt']
    assert receipt['total']==501
    assert receipt['receiptNo'].startswith('WAD') and len(receipt['receiptNo'])==10
    assert receipt['isTest'] is True
    assert receipt['paymentEnvironment']=='test'
    assert receipt['paymentMode'].startswith('Razorpay TEST')
    assert client.post('/api/receipts/lookup',json={'receipt_no':receipt['receiptNo'],'phone':'0000000000'}).status_code==404
    assert client.post('/api/receipts/lookup',json={'receipt_no':receipt['receiptNo'],'phone':'9876543210'}).status_code==200
    again=client.post('/api/payments/verify',json=data)
    assert again.json()['receipt']['receiptNo']==receipt['receiptNo']
    with SessionLocal() as db:
        assert db.query(Receipt).count()==1

def test_server_refuses_client_side_seva_price_and_unknown_id(client,monkeypatch,auth):
    monkeypatch.setenv('RAZORPAY_KEY_ID','rzp_test_test')
    monkeypatch.setenv('RAZORPAY_KEY_SECRET','testsecret')
    created=client.post('/api/admin/sevas',headers=auth,json={'id':'ganahoma','name':'Ganahoma','price':3000,'category':'offerings'})
    assert created.status_code==201,created.text
    account=client.post('/api/auth/register',json={'username':'shyamtest','password':'ThisIsATestPass123!',
       'email':'shyam@example.invalid','full_name':'Shyam Pai','phone':'9876543210'})
    assert account.status_code==201,account.text
    token=client.post('/api/auth/login',json={'username':'shyamtest','password':'ThisIsATestPass123!'}).json()['access_token']
    headers={'Authorization':f'Bearer {token}'}
    base={'purpose':'seva','devotee':{'name':'Shyam Pai','phone':'9876543210'},'sevaIds':['ganahoma']}
    unauth=client.post('/api/payments/orders',json={**base,'amount':3000})
    assert unauth.status_code==401
    unknown=client.post('/api/payments/orders',headers=headers,json={**base,'sevaIds':['unknown-service'],'amount':3000})
    assert unknown.status_code==422
    changed=client.post('/api/payments/orders',headers=headers,json={**base,'amount':1})
    assert changed.status_code==409


def test_payment_config_shows_free_sandbox_without_keys(client, monkeypatch):
    monkeypatch.setenv('APP_ENV', 'development')
    monkeypatch.setenv('RAZORPAY_MODE', 'test')
    monkeypatch.delenv('RAZORPAY_KEY_ID', raising=False)
    monkeypatch.delenv('RAZORPAY_KEY_SECRET', raising=False)
    response = client.get('/api/payments/config')
    assert response.status_code == 200
    assert response.json()['freeSimulation'] is True
    assert response.json()['configured'] is False
    assert 'secret' not in response.text.lower()


def test_payment_mode_prevents_live_charges_in_development(client, monkeypatch):
    monkeypatch.setenv('APP_ENV', 'development')
    monkeypatch.setenv('RAZORPAY_MODE', 'live')
    monkeypatch.setenv('RAZORPAY_KEY_ID', 'rzp_live_fake')
    monkeypatch.setenv('RAZORPAY_KEY_SECRET', 'fake')
    status = client.get('/api/payments/config').json()
    assert status['configured'] is False
    order = client.post('/api/payments/orders', json={'purpose': 'donation', 'donor': {'name': 'Test', 'phone': '9876543210'}, 'amount': 101})
    assert order.status_code == 503
    with SessionLocal() as db:
        assert db.query(Receipt).count() == 0
        assert db.query(PaymentOrder).count() == 0


def test_payment_mode_prevents_test_receipts_in_production(client, monkeypatch):
    monkeypatch.setenv('APP_ENV', 'production')
    monkeypatch.setenv('RAZORPAY_MODE', 'test')
    monkeypatch.setenv('RAZORPAY_KEY_ID', 'rzp_test_fake')
    monkeypatch.setenv('RAZORPAY_KEY_SECRET', 'fake')
    assert client.get('/api/payments/config').json()['configured'] is False
    assert client.post('/api/payments/orders', json={'purpose': 'donation', 'donor': {'name': 'Test', 'phone': '9876543210'}, 'amount': 101}).status_code == 503


def test_live_receipt_has_separate_prefix(client, monkeypatch):
    monkeypatch.setenv('APP_ENV', 'production')
    monkeypatch.setenv('RAZORPAY_MODE', 'live')
    monkeypatch.setenv('RAZORPAY_KEY_ID', 'rzp_live_test_fixture')
    monkeypatch.setenv('RAZORPAY_KEY_SECRET', 'fixture_secret')
    from app import routes_payments

    class FakeClient:
        def __init__(self, *a, **kw): pass
        def __enter__(self): return self
        def __exit__(self, *a): pass
        def post(self, *a, **kw):
            return Mock(json=lambda: {'id': 'order_fixture_live'}, raise_for_status=lambda: None)

    monkeypatch.setattr(routes_payments.httpx, 'Client', FakeClient)
    created = client.post('/api/payments/orders', json={
        'purpose': 'donation', 'donor': {'name': 'A B', 'phone': '9876543210'}, 'amount': 101,
    })
    assert created.status_code == 201, created.text
    assert created.json()['paymentMode'] == 'live'
    monkeypatch.setattr(routes_payments, 'razorpay_get', lambda _: {
        'id': 'pay_fixture_live', 'order_id': 'order_fixture_live', 'status': 'captured',
        'currency': 'INR', 'amount': 10100,
    })
    sig = hmac.new(b'fixture_secret', b'order_fixture_live|pay_fixture_live', hashlib.sha256).hexdigest()
    paid = client.post('/api/payments/verify', json={
        'order_id': created.json()['order_id'], 'razorpay_order_id': 'order_fixture_live',
        'razorpay_payment_id': 'pay_fixture_live', 'razorpay_signature': sig,
    })
    assert paid.status_code == 200, paid.text
    receipt = paid.json()['receipt']
    assert receipt['receiptNo'].startswith('WAD') and len(receipt['receiptNo'])==10
    assert receipt['isTest'] is False
    assert receipt['paymentEnvironment'] == 'live'


def test_existing_test_order_cannot_be_completed_after_mode_change(client, monkeypatch):
    monkeypatch.setenv('APP_ENV', 'development')
    monkeypatch.setenv('RAZORPAY_MODE', 'test')
    monkeypatch.setenv('RAZORPAY_KEY_ID', 'rzp_test_fixture')
    monkeypatch.setenv('RAZORPAY_KEY_SECRET', 'test_secret')
    from app import routes_payments
    class FakeClient:
        def __init__(self, *a, **kw): pass
        def __enter__(self): return self
        def __exit__(self, *a): pass
        def post(self, *a, **kw):
            return Mock(json=lambda: {'id': 'order_switch_test'}, raise_for_status=lambda: None)
    monkeypatch.setattr(routes_payments.httpx, 'Client', FakeClient)
    order = client.post('/api/payments/orders', json={'purpose':'donation', 'donor':{'name':'Test User','phone':'9876543210'},'amount':501}).json()
    monkeypatch.setenv('APP_ENV', 'production')
    monkeypatch.setenv('RAZORPAY_MODE', 'live')
    monkeypatch.setenv('RAZORPAY_KEY_ID', 'rzp_live_fixture')
    signature = hmac.new(b'test_secret', b'order_switch_test|pay_switch_test', hashlib.sha256).hexdigest()
    result = client.post('/api/payments/verify', json={
        'order_id': order['order_id'], 'razorpay_order_id': 'order_switch_test',
        'razorpay_payment_id': 'pay_switch_test', 'razorpay_signature': signature,
    })
    assert result.status_code == 409
    with SessionLocal() as db:
        assert db.query(Receipt).count() == 0
