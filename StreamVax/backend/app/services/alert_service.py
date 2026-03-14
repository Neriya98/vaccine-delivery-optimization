from flask import current_app
from datetime import date, timedelta
from app import db
from app.models.alert import Alert
from app.models.daily_record import DailyRecord
from app.models.prediction import Prediction

def check_and_create_alerts(centre):
    _alert_stock_low(centre, current_app.config["STOCK_LOW_THRESHOLD"])
    _alert_surge_risk(centre, date.today(), current_app.config["SURGE_RISK_THRESHOLD"])
    _alert_missed_entry(centre, date.today())
    db.session.commit()

def _alert_stock_low(centre, threshold_pct):
    stock = centre.stock_actuel
    jours = stock / (centre.capacite_jour or 1)
    if jours < (threshold_pct / 10):
        _create_if_not_exists(centre.id, "stock_low",
            f"Stock critique : {stock} doses restantes (~{jours:.1f} jours).")

def _alert_surge_risk(centre, today, threshold):
    pred = Prediction.query.filter_by(centre_id=centre.id, date=today + timedelta(days=1)).first()
    if pred and pred.pred_emergencies and centre.capacite_jour:
        ratio = pred.pred_emergencies / centre.capacite_jour
        if ratio >= threshold:
            _create_if_not_exists(centre.id, "surge_risk",
                f"Risque de surcharge demain : {pred.pred_emergencies} urgences prédites ({ratio:.1f}x capacité).")

def _alert_missed_entry(centre, today):
    yesterday = today - timedelta(days=1)
    if not DailyRecord.query.filter_by(centre_id=centre.id, date=yesterday).first():
        _create_if_not_exists(centre.id, "missed_entry",
            f"Aucune saisie pour le {yesterday.strftime('%d/%m/%Y')}.")

def _create_if_not_exists(centre_id, alert_type, message):
    if not Alert.query.filter_by(centre_id=centre_id, type=alert_type, is_read=False).first():
        db.session.add(Alert(centre_id=centre_id, type=alert_type, message=message))
