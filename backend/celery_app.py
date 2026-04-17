from celery import Celery
from celery.schedules import crontab
import os

# Initialize Celery
celery_app = Celery(
    'smartshift',
    broker=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
    backend=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
    include=['tasks.score_updater', 'tasks.weekly_billing', 'tasks.weekly_summary']
)

# Configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Asia/Kolkata',
    enable_utc=True,
)

# Celery Beat Schedule
celery_app.conf.beat_schedule = {
    'update-zone-scores': {
        'task': 'tasks.score_updater.update_all_zone_scores',
        'schedule': 900.0,  # Every 15 minutes (900 seconds)
    },
    'weekly-billing': {
        'task': 'tasks.weekly_billing.process_weekly_billing',
        'schedule': crontab(hour=6, minute=0, day_of_week=1),  # Monday 6 AM
    },
    'weekly-summary': {
        'task': 'tasks.weekly_summary.send_weekly_summaries',
        'schedule': crontab(hour=20, minute=0, day_of_week=0), # Sunday 8 PM
    },
}

if __name__ == '__main__':
    celery_app.start()
