from app import db, login_manager, bcrypt
from flask_login import UserMixin
from datetime import datetime

class User(UserMixin, db.Model):
    __tablename__ = "users"
    ROLES = ("centre", "zone", "decideur")

    id         = db.Column(db.Integer, primary_key=True)
    email      = db.Column(db.String(150), unique=True, nullable=False)
    password   = db.Column(db.String(255), nullable=False)
    nom        = db.Column(db.String(120))
    role       = db.Column(db.String(20), nullable=False)
    centre_id  = db.Column(db.Integer, db.ForeignKey("centres.id"), nullable=True)
    zone_id    = db.Column(db.Integer, db.ForeignKey("zones.id"),   nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password = bcrypt.generate_password_hash(password).decode("utf-8")

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password, password)

    def to_dict(self):
        return {"id": self.id, "email": self.email, "role": self.role, "nom": self.nom}

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))
