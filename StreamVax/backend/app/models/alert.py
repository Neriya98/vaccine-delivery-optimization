from app import db
from datetime import datetime

class Alert(db.Model):
    __tablename__ = "alerts"
    TYPES = ("stock_low", "surge_risk", "missed_entry", "delivery_due")

    id         = db.Column(db.Integer, primary_key=True)
    centre_id  = db.Column(db.Integer, db.ForeignKey("centres.id"), nullable=False)
    type       = db.Column(db.String(30), nullable=False)
    message    = db.Column(db.String(255), nullable=False)
    is_read    = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id, "centre_id": self.centre_id, "type": self.type,
            "message": self.message, "is_read": self.is_read,
            "created_at": self.created_at.isoformat(),
        }
