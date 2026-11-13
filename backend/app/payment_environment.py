"""Explicit separation between Razorpay Test Mode and live transactions."""
import os
from fastapi import HTTPException


def payment_configuration() -> dict:
    mode = os.getenv('RAZORPAY_MODE', 'test').strip().lower()
    app_env = os.getenv('APP_ENV', 'development').strip().lower()
    key = os.getenv('RAZORPAY_KEY_ID', '').strip()
    secret = os.getenv('RAZORPAY_KEY_SECRET', '').strip()
    valid_mode = mode in ('test', 'live')
    valid_env = app_env in ('development', 'staging', 'production')
    correct_key = valid_mode and key.startswith(f'rzp_{mode}_')
    safe_pairing = (app_env == 'production') == (mode == 'live')
    configured = bool(key and secret and valid_mode and valid_env and correct_key and safe_pairing)
    if not valid_mode or not valid_env:
        notice = 'Invalid server environment or payment mode.'
    elif not safe_pairing:
        notice = 'Payment environment mismatch: test keys only in development/staging; live keys only in production.'
    elif key and not correct_key:
        notice = 'Razorpay key prefix does not match the configured payment mode.'
    elif not key or not secret:
        notice = 'Razorpay credentials not configured; payment checkout is disabled.'
    elif mode == 'test':
        notice = 'TEST MODE: payments are simulated and no real money is collected. Test receipts are not valid donation receipts.'
    else:
        notice = 'Live Razorpay payment processing is enabled.'
    return {'mode': mode if valid_mode else 'invalid', 'configured': configured,
            'freeSimulation': mode == 'test', 'notice': notice}


def payment_credentials() -> tuple[str, str, str]:
    config = payment_configuration()
    if not config['configured']:
        raise HTTPException(503, f"Online payments unavailable: {config['notice']}")
    return (config['mode'], os.environ['RAZORPAY_KEY_ID'].strip(),
            os.environ['RAZORPAY_KEY_SECRET'].strip())
