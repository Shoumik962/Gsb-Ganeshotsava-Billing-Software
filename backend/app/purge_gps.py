"""Scheduled cleanup: run each 5 minutes using cron or a scheduled container task."""
from datetime import timedelta
from sqlalchemy import delete, update, select
from .database import SessionLocal
from .models import Sevadar, SevadarLocation, utcnow

def main():
    cutoff=utcnow()-timedelta(minutes=15)
    with SessionLocal() as db:
        stale_ids=db.scalars(select(SevadarLocation.sevadar_id).where(SevadarLocation.updated_at<cutoff)).all()
        if stale_ids:
            db.execute(delete(SevadarLocation).where(SevadarLocation.sevadar_id.in_(stale_ids)))
            db.execute(update(Sevadar).where(Sevadar.id.in_(stale_ids)).values(location_consent=False))
        db.commit()
        print(f'Purged {len(stale_ids)} expired GPS locations')
if __name__=='__main__':main()
