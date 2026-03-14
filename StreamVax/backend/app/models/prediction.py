from app import db
from datetime import datetime, date

class Prediction(db.Model):
    __tablename__ = "predictions"
    id                  = db.Column(db.Integer, primary_key=True)
    centre_id           = db.Column(db.Integer, db.ForeignKey("centres.id"), nullable=False)
    date                = db.Column(db.Date, nullable=False)
    pred_vaccines       = db.Column(db.Integer)
    pred_emergencies    = db.Column(db.Integer)
    pred_vaccines_month = db.Column(db.Integer)
    confidence          = db.Column(db.Float)
    fetched_at          = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint("centre_id", "date", name="uq_pred_centre_date"),)

    def to_dict(self):
        return {
            "centre_id": self.centre_id, "date": self.date.isoformat(),
            "pred_vaccines": self.pred_vaccines, "pred_emergencies": self.pred_emergencies,
            "pred_vaccines_month": self.pred_vaccines_month, "confidence": self.confidence,
        }
