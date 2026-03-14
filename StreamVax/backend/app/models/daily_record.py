from app import db
from datetime import datetime, date

class DailyRecord(db.Model):
    __tablename__ = "daily_records"
    id               = db.Column(db.Integer, primary_key=True)
    centre_id        = db.Column(db.Integer, db.ForeignKey("centres.id"), nullable=False)
    date             = db.Column(db.Date, nullable=False, default=date.today)
    vaccines_done    = db.Column(db.Integer, default=0)
    emergencies_real = db.Column(db.Integer, default=0)
    stock_used       = db.Column(db.Integer, default=0)
    notes            = db.Column(db.Text)
    created_at       = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at       = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint("centre_id", "date", name="uq_centre_date"),)

    def to_dict(self):
        return {
            "id": self.id, "centre_id": self.centre_id, "date": self.date.isoformat(),
            "vaccines_done": self.vaccines_done, "emergencies_real": self.emergencies_real,
            "stock_used": self.stock_used,
        }
