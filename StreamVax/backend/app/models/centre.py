from app import db
from datetime import datetime

class Centre(db.Model):
    __tablename__ = "centres"
    id            = db.Column(db.Integer, primary_key=True)
    nom           = db.Column(db.String(120), nullable=False)
    adresse       = db.Column(db.String(255))
    latitude      = db.Column(db.Float)
    longitude     = db.Column(db.Float)
    capacite_jour = db.Column(db.Integer, default=100)
    zone_id       = db.Column(db.Integer, db.ForeignKey("zones.id"), nullable=False)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    users         = db.relationship("User", backref="centre", lazy="dynamic")
    daily_records = db.relationship("DailyRecord", backref="centre", lazy="dynamic")
    predictions   = db.relationship("Prediction", backref="centre", lazy="dynamic")
    deliveries    = db.relationship("StockDelivery", backref="centre", lazy="dynamic")
    alerts        = db.relationship("Alert", backref="centre", lazy="dynamic")

    @property
    def stock_actuel(self):
        from app.models.stock import StockDelivery
        from app.models.daily_record import DailyRecord
        livres = db.session.query(
            db.func.coalesce(db.func.sum(StockDelivery.quantite), 0)
        ).filter_by(centre_id=self.id, statut="livre").scalar()
        utilises = db.session.query(
            db.func.coalesce(db.func.sum(DailyRecord.stock_used), 0)
        ).filter_by(centre_id=self.id).scalar()
        return int(livres - utilises)

    def to_dict(self):
        return {
            "id": self.id, "nom": self.nom, "adresse": self.adresse,
            "latitude": self.latitude, "longitude": self.longitude,
            "capacite_jour": self.capacite_jour, "zone_id": self.zone_id,
            "stock_actuel": self.stock_actuel,
        }
