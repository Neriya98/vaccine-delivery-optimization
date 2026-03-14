from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from flask_bcrypt import Bcrypt
from config import get_config

db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
bcrypt = Bcrypt()

def create_app():
    app = Flask(__name__)
    app.config.from_object(get_config())

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    bcrypt.init_app(app)

    login_manager.login_view = "auth.login"
    login_manager.login_message = "Veuillez vous connecter pour accéder à cette page."
    login_manager.login_message_category = "warning"

    from app.blueprints.auth.routes import auth_bp
    from app.blueprints.centre.routes import centre_bp
    from app.blueprints.zone.routes import zone_bp
    from app.blueprints.decideur.routes import decideur_bp
    from app.blueprints.api.routes import api_bp

    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(centre_bp, url_prefix="/centre")
    app.register_blueprint(zone_bp, url_prefix="/zone")
    app.register_blueprint(decideur_bp, url_prefix="/decideur")
    app.register_blueprint(api_bp, url_prefix="/api/v1")

    from app.models import user, centre, zone, daily_record, prediction, stock  # noqa

    return app
