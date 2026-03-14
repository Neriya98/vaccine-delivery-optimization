from flask import Blueprint, render_template, jsonify, flash, redirect, url_for
from flask_login import login_required, current_user
from functools import wraps
from datetime import date, timedelta
from app import db
from app.models.zone import Zone
from app.models.centre import Centre
from app.models.daily_record import DailyRecord

decideur_bp = Blueprint("decideur", __name__, template_folder="templates")

def decideur_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user.is_authenticated or current_user.role != "decideur":
            flash("Accès non autorisé.", "danger")
            return redirect(url_for("auth.login"))
        return f(*args, **kwargs)
    return decorated

@decideur_bp.route("/dashboard")
@login_required
@decideur_required
def dashboard():
    today = date.today()
    since = today - timedelta(days=30)
    zones = Zone.query.all()
    total_vaccines = db.session.query(
        db.func.coalesce(db.func.sum(DailyRecord.vaccines_done), 0)
    ).filter(DailyRecord.date >= since).scalar()
    total_emergencies = db.session.query(
        db.func.coalesce(db.func.sum(DailyRecord.emergencies_real), 0)
    ).filter(DailyRecord.date >= since).scalar()
    return render_template("decideur/dashboard.html", zones=zones,
        total_vaccines=total_vaccines, total_emergencies=total_emergencies,
        nb_centres=Centre.query.count(), today=today)

@decideur_bp.route("/api/map-data")
@login_required
@decideur_required
def map_data():
    today = date.today()
    since = today - timedelta(days=30)
    features = []
    for z in Zone.query.all():
        centres = z.centres.all()
        vaccins = sum(
            db.session.query(db.func.coalesce(db.func.sum(DailyRecord.vaccines_done), 0))
            .filter(DailyRecord.centre_id == c.id, DailyRecord.date >= since).scalar()
            for c in centres
        )
        features.append({
            "zone_id": z.id, "nom": z.nom, "region": z.region,
            "departement": z.departement, "nb_centres": len(centres),
            "total_vaccines_30j": vaccins,
            "centres": [c.to_dict() for c in centres],
        })
    return jsonify(features)
