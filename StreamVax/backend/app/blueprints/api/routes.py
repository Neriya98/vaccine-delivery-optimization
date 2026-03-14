from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from datetime import date
from app.models.daily_record import DailyRecord
from app.models.prediction import Prediction
from app.models.centre import Centre

api_bp = Blueprint("api", __name__)

@api_bp.route("/centres/<int:centre_id>/records")
@login_required
def get_records(centre_id):
    records = DailyRecord.query.filter_by(centre_id=centre_id)\
                               .order_by(DailyRecord.date.desc()).limit(30).all()
    return jsonify([r.to_dict() for r in records])

@api_bp.route("/centres/<int:centre_id>/predictions")
@login_required
def get_predictions(centre_id):
    preds = Prediction.query.filter_by(centre_id=centre_id)\
                            .filter(Prediction.date >= date.today())\
                            .order_by(Prediction.date.asc()).all()
    return jsonify([p.to_dict() for p in preds])

@api_bp.route("/centres")
@login_required
def get_centres():
    centres = Centre.query.all()
    return jsonify([c.to_dict() for c in centres])
