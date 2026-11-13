import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes_identity import router as identity_router
from .routes_sevadar import router as sevadar_router
from .routes_payments import router as payments_router

from .routes_admin import router as admin_router
from .routes_accounts import router as accounts_router

app=FastAPI(title='Wadala Ganeshotsav API',version='1.0.0',description='Verified payments, governed identity and family deduplication, consented sevadar mapping')
origins=[s.strip() for s in os.getenv('CORS_ORIGINS','http://localhost:5173').split(',') if s.strip()]
app.add_middleware(CORSMiddleware,allow_origins=origins,allow_methods=['GET','POST','PATCH','DELETE'],allow_headers=['Authorization','Content-Type','X-Razorpay-Signature'])
app.include_router(identity_router)
app.include_router(sevadar_router)
app.include_router(payments_router)
app.include_router(admin_router)
app.include_router(accounts_router)

@app.get('/api/health')
def health(): return {'status':'ok'}
