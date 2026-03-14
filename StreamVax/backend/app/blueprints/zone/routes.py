from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from datetime import date, timedelta
from functools import wraps
from app import db
from app.models.stock import StockDelivery
from app.models.prediction import Prediction
from app.models.alert import Alert

zone_bp = Blueprint("zone", __name__, template_folder="templates")

def zone_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user.is_authenticated or current_user.role != "zone":
            flash("Accès non autorisé.", "danger")
            return redirect(url_for("auth.login"))
        return f(*args, **kwargs)
    return decorated

@zone_bp.route("/dashboard")
@login_required
@zone_required
def dashboard():
    zone     = current_user.zone
    today    = date.today()
    tomorrow = today + timedelta(days=1)
    centres  = zone.centres.all()
    centres_data = []
    for c in centres:
        pred = Prediction.query.filter_by(centre_id=c.id, date=tomorrow).first()
        unread = Alert.query.filter_by(centre_id=c.id, is_read=False).count()
        centres_data.append({
            "centre": c,
            "pred_vaccines_tomorrow": pred.pred_vaccines if pred else None,
            "pred_vaccines_month": pred.pred_vaccines_month if pred else None,
            "stock_actuel": c.stock_actuel,
            "unread_alerts": unread,
        })
    livraisons = StockDelivery.query.filter(
        StockDelivery.zone_id == zone.id,
        StockDelivery.statut.in_(["planifie", "en_transit"])
    ).order_by(StockDelivery.date_livraison.asc()).all()
    return render_template("zone/dashboard.html", zone=zone, centres_data=centres_data,
                           livraisons=livraisons, today=today)

@zone_bp.route("/livraison/creer", methods=["POST"])
@login_required
@zone_required
def creer_livraison():
    zone      = current_user.zone
    centre_id = int(request.form.get("centre_id"))
    quantite  = int(request.form.get("quantite"))
    date_str  = request.form.get("date_livraison")
    notes     = request.form.get("notes", "")
    centre    = zone.centres.filter_by(id=centre_id).first()
    if not centre:
        flash("Centre invalide.", "danger")
        return redirect(url_for("zone.dashboard"))
    db.session.add(StockDelivery(centre_id=centre_id, zone_id=zone.id,
                                  date_livraison=date.fromisoformat(date_str),
                                  quantite=quantite, notes=notes))
    db.session.commit()
    flash(f"Livraison de {quantite} doses planifiée pour {centre.nom}.", "success")
    return redirect(url_for("zone.dashboard"))

@zone_bp.route("/livraison/<int:lid>/statut", methods=["POST"])
@login_required
@zone_required
def update_statut_livraison(lid):
    livraison = StockDelivery.query.get_or_404(lid)
    if livraison.zone_id != current_user.zone_id:
        flash("Non autorisé.", "danger")
        return redirect(url_for("zone.dashboard"))
    statut = request.form.get("statut")
    if statut in StockDelivery.STATUTS:
        livraison.statut = statut
        db.session.commit()
        flash("Statut mis à jour.", "success")
    return redirect(url_for("zone.dashboard"))
