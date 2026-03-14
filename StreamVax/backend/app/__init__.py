from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from config import get_config

db = SQLAlchemy()
migrate = Migrate()
bcrypt = Bcrypt()

def create_app():
    app = Flask(__name__)
    app.config.from_object(get_config())

    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    CORS(app, supports_credentials=True)

    from app.blueprints.api.routes import api_bp
    app.register_blueprint(api_bp, url_prefix="/api/v1")

    from app.models import user, centre, zone, daily_record, prediction, stock, alert  # noqa

    return app
