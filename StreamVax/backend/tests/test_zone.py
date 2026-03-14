import pytest
from app import create_app, db
from app.models.zone import Zone
from app.models.centre import Centre
from app.models.user import User
from app.models.stock import StockDelivery
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

        centre = Centre(nom="Centre A", adresse="1 rue A",
                        capacite_jour=100, zone_id=zone.id)
        db.session.add(centre)
        db.session.flush()

        user = User(email="zone@test.fr", nom="Zone Agent", role="zone",
                    zone_id=zone.id)
        user.set_password("test1234")
        db.session.add(user)
        db.session.commit()
        return {"zone": zone, "centre": centre, "user": user}


def test_zone_to_dict(app, sample_data):
    with app.app_context():
        zone = Zone.query.get(sample_data["zone"].id)
        d = zone.to_dict()
        assert d["nom"] == "Zone Test"
        assert d["region"] == "Test"


def test_creer_livraison(app, client, sample_data):
    with client:
        client.post("/auth/login", data={"email": "zone@test.fr", "password": "test1234"})
        client.post("/zone/livraison/creer", data={
            "centre_id": sample_data["centre"].id,
            "quantite": 500,
            "date_livraison": date.today().isoformat(),
            "notes": "Livraison urgente",
        })
        with app.app_context():
            delivery = StockDelivery.query.first()
            assert delivery is not None
            assert delivery.quantite == 500
            assert delivery.statut == "planifie"
