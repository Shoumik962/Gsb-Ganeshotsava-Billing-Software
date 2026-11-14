"""Dev-only no-OTP checkout and production payment-path separation."""
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.database import SessionLocal
from app.main import app
from app.models import Devotee, PaymentOrder, Receipt, ReceiptDelivery, SevaBooking


def _enable_qa(monkeypatch):
    monkeypatch.setenv('APP_ENV', 'development')
    monkeypatch.setenv('RAZORPAY_MODE', 'test')
    monkeypatch.setenv('ENABLE_DEMO_CHECKOUT', '1')


def _payload(seva_id):
    return {'purpose': 'seva', 'sevaIds': [seva_id], 'amount': 101,
            'devotee': {'name': 'QA Example Devotee', 'phone': '9000000199',
                        'email': 'qa-demo@example.invalid', 'address': 'QA Flat, Wadala'}}


def test_unauthenticated_local_qa_seva_generates_unpaid_receipt_without_identity(client, auth, monkeypatch):
    _enable_qa(monkeypatch)
    result = client.post('/api/admin/sevas', headers=auth, json={
        'name': 'QA test Archana', 'price': 101, 'category': 'offerings'})
    assert result.status_code == 201, result.text
    seva_id = result.json()['id']
    assert client.get('/api/payments/config').json()['demoCheckoutEnabled'] is True

    # No token, account registration, OTP, profile completion, or gateway keys.
    response = client.post('/api/payments/demo-checkout', json=_payload(seva_id))
    assert response.status_code == 201, response.text
    receipt = response.json()['receipt']
    assert receipt['receiptNo'].startswith('DEMO-RCP-')
    assert receipt['isTest'] is True and receipt['isDemo'] is True
    assert receipt['status'] == 'DEMO ONLY — NO PAYMENT'
    assert receipt['paymentReference'] == ''
    assert receipt['customerId'] == 'Not assigned'  # No forged Devotee ID
    assert receipt['total'] == 101
    assert receipt['items'][0]['price'] == 101

    assert client.post('/api/receipts/lookup', json={
        'receipt_no': receipt['receiptNo'], 'phone': '9000000199'}).status_code == 200
    with SessionLocal() as db:
        assert db.scalar(select(PaymentOrder)).gateway_mode == 'demo'
        assert db.scalar(select(PaymentOrder)).status == 'demo'
        assert db.scalar(select(SevaBooking)).status == 'demo'
        assert db.scalar(select(Receipt)).receipt_no == receipt['receiptNo']
        assert db.scalar(select(ReceiptDelivery)).status == 'skipped'
        assert db.scalars(select(Devotee)).all() == []  # QA guest does not contaminate real identity

    # Real Razorpay checkout is still identity-gated, even in development.
    monkeypatch.setenv('RAZORPAY_KEY_ID', 'rzp_test_qa_fixture')
    monkeypatch.setenv('RAZORPAY_KEY_SECRET', 'qa_secret')
    unauthenticated = client.post('/api/payments/orders', json=_payload(seva_id))
    assert unauthenticated.status_code == 401


def test_local_guest_demo_cannot_bypass_server_price_or_active_seva(client, auth, monkeypatch):
    _enable_qa(monkeypatch)
    result = client.post('/api/admin/sevas', headers=auth, json={
        'name': 'QA Price Test', 'price': 101, 'category': 'offerings'})
    seva_id = result.json()['id']
    incorrect = client.post('/api/payments/demo-checkout', json={**_payload(seva_id), 'amount': 1})
    assert incorrect.status_code == 409
    client.patch(f'/api/admin/sevas/{seva_id}', headers=auth, json={'active': False})
    disabled = client.post('/api/payments/demo-checkout', json=_payload(seva_id))
    assert disabled.status_code == 422
    with SessionLocal() as db:
        assert db.scalars(select(Receipt)).all() == []


def test_local_demo_unavailable_outside_disposable_loopback(monkeypatch, client):
    _enable_qa(monkeypatch)
    sample = _payload('any_seva')
    with TestClient(app, base_url='http://localhost:8000', client=('198.51.100.4', 3333)) as remote:
        assert remote.get('/api/payments/config').json()['demoCheckoutEnabled'] is False
        assert remote.post('/api/payments/demo-checkout', json=sample).status_code == 404
    with TestClient(app, base_url='http://public.example:8000', client=('127.0.0.1', 3333)) as tunnel:
        assert tunnel.get('/api/payments/config').json()['demoCheckoutEnabled'] is False
        assert tunnel.post('/api/payments/demo-checkout', json=sample).status_code == 404
    monkeypatch.setenv('APP_ENV', 'production')
    assert client.get('/api/payments/config').json()['demoCheckoutEnabled'] is False
    assert client.post('/api/payments/demo-checkout', json=sample).status_code == 404
    monkeypatch.setenv('APP_ENV', 'development')
    monkeypatch.setenv('DATABASE_URL', 'postgresql+psycopg://dev:fake@127.0.0.1:5432/production')
    assert client.get('/api/payments/config').json()['demoCheckoutEnabled'] is False
    assert client.post('/api/payments/demo-checkout', json=sample).status_code == 404
