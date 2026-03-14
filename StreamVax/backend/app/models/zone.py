from app import db
from datetime import datetime

class Zone(db.Model):
    __tablename__ = "zones"
    id          = db.Column(db.Integer, primary_key=True)
    nom         = db.Column(db.String(120), nullable=False)
    region      = db.Column(db.String(120))
    departement = db.Column(db.String(120))
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    centres = db.relationship("Centre", backref="zone", lazy="dynamic")
    users   = db.relationship("User", backref="zone", lazy="dynamic")

    def to_dict(self):
        return {"id": self.id, "nom": self.nom, "region": self.region, "departement": self.departement}
