from flask import Blueprint, jsonify, request, current_app
from datetime import date, timedelta, datetime
from functools import wraps
import jwt
from app import db, bcrypt
from app.models.user import User
from app.models.centre import Centre
from app.models.zone import Zone
from app.models.daily_record import DailyRecord
from app.models.prediction import Prediction
from app.models.stock import StockDelivery
from app.models.alert import Alert
from app.services.alert_service import check_and_create_alerts
from app.services.ml_client import fetch_predictions

api_bp = Blueprint("api", __name__)

# -----------  JWT helpers  -----------

def _create_token(user):
    payload = {
        "user_id": user.id,
        "role": user.role,
        "exp": datetime.utcnow() + timedelta(hours=24),
    }
    return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")


def _decode_token(token):
    return jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Token manquant"}), 401
        try:
            data = _decode_token(auth.split(" ", 1)[1])
            request.current_user = User.query.get(data["user_id"])
            if not request.current_user:
                raise ValueError("User not found")
        except Exception:
            return jsonify({"error": "Token invalide ou expiré"}), 401
        return f(*args, **kwargs)
    return decorated


def role_required(*roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if request.current_user.role not in roles:
                return jsonify({"error": "Accès non autorisé"}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator

# -----------  Auth  -----------

@api_bp.route("/auth/login", methods=["POST"])
def login():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password", "")
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Email ou mot de passe incorrect"}), 401
    return jsonify({
        "token": _create_token(user),
        "user": {"id": user.id, "email": user.email, "nom": user.nom, "role": user.role,
                 "centre_id": user.centre_id, "zone_id": user.zone_id},
    })


@api_bp.route("/auth/me")
@token_required
def me():
    u = request.current_user
    return jsonify({"id": u.id, "email": u.email, "nom": u.nom, "role": u.role,
                    "centre_id": u.centre_id, "zone_id": u.zone_id})

# -----------  Centres  -----------

@api_bp.route("/centres")
@token_required
def get_centres():
    centres = Centre.query.all()
    return jsonify([c.to_dict() for c in centres])


@api_bp.route("/centres/<int:centre_id>")
@token_required
def get_centre(centre_id):
    c = Centre.query.get_or_404(centre_id)
    return jsonify(c.to_dict())


@api_bp.route("/centres/<int:centre_id>/records")
@token_required
def get_records(centre_id):
    days = request.args.get("days", 30, type=int)
    since = date.today() - timedelta(days=days)
    records = DailyRecord.query.filter(
        DailyRecord.centre_id == centre_id, DailyRecord.date >= since
    ).order_by(DailyRecord.date.asc()).all()
    return jsonify([r.to_dict() for r in records])


@api_bp.route("/centres/<int:centre_id>/records", methods=["POST"])
@token_required
@role_required("centre")
def create_record(centre_id):
    body = request.get_json(silent=True) or {}
    today = date.today()
    record = DailyRecord.query.filter_by(centre_id=centre_id, date=today).first()
    if record:
        record.vaccines_done = body.get("vaccines_done", record.vaccines_done)
        record.emergencies_real = body.get("emergencies_real", record.emergencies_real)
        record.stock_used = body.get("stock_used", record.stock_used)
        record.notes = body.get("notes", record.notes)
    else:
        record = DailyRecord(
            centre_id=centre_id, date=today,
            vaccines_done=body.get("vaccines_done", 0),
            emergencies_real=body.get("emergencies_real", 0),
            stock_used=body.get("stock_used", 0),
            notes=body.get("notes", ""),
        )
        db.session.add(record)
    db.session.commit()
    centre = Centre.query.get(centre_id)
    check_and_create_alerts(centre)
    return jsonify(record.to_dict()), 201


@api_bp.route("/centres/<int:centre_id>/predictions")
@token_required
def get_predictions(centre_id):
    preds = Prediction.query.filter_by(centre_id=centre_id)\
                            .filter(Prediction.date >= date.today())\
                            .order_by(Prediction.date.asc()).all()
    return jsonify([p.to_dict() for p in preds])


@api_bp.route("/centres/<int:centre_id>/predictions/refresh", methods=["POST"])
@token_required
@role_required("centre", "zone", "decideur")
def refresh_predictions(centre_id):
    ok, msg = fetch_predictions(centre_id)
    if ok:
        return jsonify({"message": "Prédictions mises à jour"})
    return jsonify({"error": msg}), 502


@api_bp.route("/centres/<int:centre_id>/alerts")
@token_required
def get_alerts(centre_id):
    alerts = Alert.query.filter_by(centre_id=centre_id, is_read=False)\
                        .order_by(Alert.created_at.desc()).limit(20).all()
    return jsonify([a.to_dict() for a in alerts])


@api_bp.route("/centres/<int:centre_id>/alerts/read", methods=["POST"])
@token_required
def mark_alerts_read(centre_id):
    Alert.query.filter_by(centre_id=centre_id, is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify({"ok": True})

# -----------  Zones  -----------

@api_bp.route("/zones")
@token_required
def get_zones():
    zones = Zone.query.all()
    return jsonify([z.to_dict() for z in zones])


@api_bp.route("/zones/<int:zone_id>/centres")
@token_required
def get_zone_centres(zone_id):
    zone = Zone.query.get_or_404(zone_id)
    tomorrow = date.today() + timedelta(days=1)
    result = []
    for c in zone.centres.all():
        pred = Prediction.query.filter_by(centre_id=c.id, date=tomorrow).first()
        unread = Alert.query.filter_by(centre_id=c.id, is_read=False).count()
        result.append({
            **c.to_dict(),
            "pred_vaccines_tomorrow": pred.pred_vaccines if pred else None,
            "unread_alerts": unread,
        })
    return jsonify(result)


@api_bp.route("/zones/<int:zone_id>/deliveries")
@token_required
def get_deliveries(zone_id):
    livraisons = StockDelivery.query.filter(
        StockDelivery.zone_id == zone_id,
        StockDelivery.statut.in_(["planifie", "en_transit"])
    ).order_by(StockDelivery.date_livraison.asc()).all()
    return jsonify([l.to_dict() for l in livraisons])


@api_bp.route("/zones/<int:zone_id>/deliveries", methods=["POST"])
@token_required
@role_required("zone")
def create_delivery(zone_id):
    body = request.get_json(silent=True) or {}
    zone = Zone.query.get_or_404(zone_id)
    centre = zone.centres.filter_by(id=body.get("centre_id")).first()
    if not centre:
        return jsonify({"error": "Centre invalide"}), 400
    delivery = StockDelivery(
        centre_id=centre.id, zone_id=zone.id,
        date_livraison=date.fromisoformat(body["date_livraison"]),
        quantite=body["quantite"],
        notes=body.get("notes", ""),
    )
    db.session.add(delivery)
    db.session.commit()
    return jsonify(delivery.to_dict()), 201


@api_bp.route("/deliveries/<int:lid>/status", methods=["PUT"])
@token_required
@role_required("zone")
def update_delivery_status(lid):
    body = request.get_json(silent=True) or {}
    livraison = StockDelivery.query.get_or_404(lid)
    statut = body.get("statut")
    if statut not in StockDelivery.STATUTS:
        return jsonify({"error": "Statut invalide"}), 400
    livraison.statut = statut
    db.session.commit()
    return jsonify(livraison.to_dict())

# -----------  Dashboard national  -----------

@api_bp.route("/dashboard/national")
@token_required
def dashboard_national():
    today = date.today()
    since = today - timedelta(days=30)
    total_vaccines = db.session.query(
        db.func.coalesce(db.func.sum(DailyRecord.vaccines_done), 0)
    ).filter(DailyRecord.date >= since).scalar()
    total_emergencies = db.session.query(
        db.func.coalesce(db.func.sum(DailyRecord.emergencies_real), 0)
    ).filter(DailyRecord.date >= since).scalar()
    return jsonify({
        "total_vaccines_30j": total_vaccines,
        "total_emergencies_30j": total_emergencies,
        "nb_centres": Centre.query.count(),
        "nb_zones": Zone.query.count(),
    })


@api_bp.route("/dashboard/map-data")
@token_required
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
