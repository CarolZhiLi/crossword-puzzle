from flask import request
from datetime import datetime

from models import ApiStatistic
from utils.db_admin import admin_session_scope
from extensions import db


def record_api_call(response):
  req_method = request.method
  req_endpoint = request.path
  try:
    # Look up the existing stat
    stat = ApiStatistic.query.filter_by(
        method=req_method, 
        endpoint=req_endpoint
        ).first()

    if stat:
      # Increment count
      stat.count += 1
      stat.recorded_at = datetime.utcnow()
      with admin_session_scope() as s:
        s.merge(stat)
    else:
      # Create new record
      new_stat = ApiStatistic(method=req_method, endpoint=req_endpoint, count=1, recorded_at=datetime.utcnow())
      with admin_session_scope() as s:
        s.add(new_stat)
        print("added new :)")

    db.session.commit()

  except Exception as e:
    db.session.rollback()
    print(f"Error saving API call stat: {e}")
            
  return response
