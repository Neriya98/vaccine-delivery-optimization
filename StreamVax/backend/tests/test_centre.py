import pytest
from app import create_app, db
from app.models.centre import Centre
from app.models.zone import Zone
from app.models.daily_record import DailyRecord
from app.models.user import User
from datetime import date


@pytest.fixture
def app():
    app = create_app()
    app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "WTF_CSRF_ENABLED": False,
    })
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def sample_data(app):
    with app.app_context():
        zone = Zone(nom="Zone Test", region="Test", departement="00")
        db.session.add(zone)
        db.session.flush()

        centre = Centre(nom="Centre Test", adresse="1 rue Test",
                        latitude=48.85, longitude=2.35,
                        capacite_jour=100, zone_id=zone.id)
        db.session.add(centre)
        db.session.flush()

        user = User(email="centre@test.fr", nom="Test Agent", role="centre",
                    centre_id=centre.id)
        user.set_password("test1234")
        db.session.add(user)
        db.session.commit()
        return {"zone": zone, "centre": centre, "user": user}


def test_centre_stock_actuel(app, sample_data):
    with app.app_context():
        centre = Centre.query.get(sample_data["centre"].id)
        assert centre.stock_actuel == 0


def test_centre_to_dict(app, sample_data):
    with app.app_context():
        centre = Centre.query.get(sample_data["centre"].id)
        d = centre.to_dict()
        assert d["nom"] == "Centre Test"
        assert d["capacite_jour"] == 100
        assert "stock_actuel" in d


def test_saisie_creates_record(app, client, sample_data):
    with app.app_context():
        user = User.query.get(sample_data["user"].id)
    with client:
        client.post("/auth/login", data={"email": "centre@test.fr", "password": "test1234"})
        client.post("/centre/saisie", data={
            "vaccines_done": 50, "emergencies_real": 3,
            "stock_used": 50, "notes": "RAS",
        })
        with app.app_context():
            record = DailyRecord.query.filter_by(
                centre_id=sample_data["centre"].id, date=date.today()
            ).first()
            assert record is not None
            assert record.vaccines_done == 50
