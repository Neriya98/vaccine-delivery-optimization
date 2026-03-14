from app import db
from datetime import datetime, date

class StockDelivery(db.Model):
    __tablename__ = "stock_deliveries"
    STATUTS = ("planifie", "en_transit", "livre")

    id             = db.Column(db.Integer, primary_key=True)
    centre_id      = db.Column(db.Integer, db.ForeignKey("centres.id"), nullable=False)
    zone_id        = db.Column(db.Integer, db.ForeignKey("zones.id"),   nullable=False)
    date_livraison = db.Column(db.Date, nullable=False, default=date.today)
    quantite       = db.Column(db.Integer, nullable=False)
    statut         = db.Column(db.String(20), default="planifie")
    notes          = db.Column(db.Text)
    created_at     = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id, "centre_id": self.centre_id, "zone_id": self.zone_id,
            "date_livraison": self.date_livraison.isoformat(),
            "quantite": self.quantite, "statut": self.statut,
        }
