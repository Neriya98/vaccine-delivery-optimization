from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_required, current_user
from datetime import date, timedelta
from functools import wraps
from app import db
from app.models.daily_record import DailyRecord
from app.models.prediction import Prediction
from app.models.alert import Alert
from app.services.alert_service import check_and_create_alerts
from app.services.ml_client import fetch_predictions

centre_bp = Blueprint("centre", __name__, template_folder="templates")

def role_required(role):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not current_user.is_authenticated or current_user.role != role:
                flash("Accès non autorisé.", "danger")
                return redirect(url_for("auth.login"))
            return f(*args, **kwargs)
        return decorated
    return decorator

@centre_bp.route("/dashboard")
@login_required
@role_required("centre")
def dashboard():
    centre   = current_user.centre
    today    = date.today()
    tomorrow = today + timedelta(days=1)
    pred_today    = Prediction.query.filter_by(centre_id=centre.id, date=today).first()
    pred_tomorrow = Prediction.query.filter_by(centre_id=centre.id, date=tomorrow).first()
    record_today  = DailyRecord.query.filter_by(centre_id=centre.id, date=today).first()
    since   = today - timedelta(days=30)
    history = DailyRecord.query.filter(
        DailyRecord.centre_id == centre.id, DailyRecord.date >= since
    ).order_by(DailyRecord.date.asc()).all()
    alerts  = Alert.query.filter_by(centre_id=centre.id, is_read=False)\
                         .order_by(Alert.created_at.desc()).limit(10).all()
    total_vaccines_month    = sum(r.vaccines_done for r in history)
    total_emergencies_month = sum(r.emergencies_real for r in history)
    taux_couverture = round(
        (total_vaccines_month / (centre.capacite_jour * 30)) * 100, 1
    ) if centre.capacite_jour else 0
    return render_template("centre/dashboard.html",
        centre=centre, pred_today=pred_today, pred_tomorrow=pred_tomorrow,
        record_today=record_today, history=history, alerts=alerts,
        stock_actuel=centre.stock_actuel, total_vaccines_month=total_vaccines_month,
        total_emergencies_month=total_emergencies_month,
        taux_couverture=taux_couverture, today=today,
    )

@centre_bp.route("/saisie", methods=["POST"])
@login_required
@role_required("centre")
def saisie():
    centre = current_user.centre
    today  = date.today()
    vaccines    = int(request.form.get("vaccines_done", 0))
    emergencies = int(request.form.get("emergencies_real", 0))
    stock_used  = int(request.form.get("stock_used", vaccines))
    notes       = request.form.get("notes", "")
    record = DailyRecord.query.filter_by(centre_id=centre.id, date=today).first()
    if record:
        record.vaccines_done    = vaccines
        record.emergencies_real = emergencies
        record.stock_used       = stock_used
        record.notes            = notes
    else:
        record = DailyRecord(centre_id=centre.id, date=today, vaccines_done=vaccines,
                             emergencies_real=emergencies, stock_used=stock_used, notes=notes)
        db.session.add(record)
    db.session.commit()
    check_and_create_alerts(centre)
    flash("Saisie enregistrée avec succès.", "success")
    return redirect(url_for("centre.dashboard"))

@centre_bp.route("/alertes/lues", methods=["POST"])
@login_required
@role_required("centre")
def mark_alerts_read():
    Alert.query.filter_by(centre_id=current_user.centre.id, is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify({"ok": True})

@centre_bp.route("/refresh-predictions")
@login_required
@role_required("centre")
def refresh_predictions():
    ok, msg = fetch_predictions(current_user.centre.id)
    flash("Prédictions mises à jour." if ok else f"Erreur ML : {msg}", "success" if ok else "warning")
    return redirect(url_for("centre.dashboard"))
