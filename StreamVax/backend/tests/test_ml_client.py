import pytest
from unittest.mock import patch, MagicMock
from app import create_app, db
from app.models.centre import Centre
from app.models.zone import Zone
from app.models.prediction import Prediction
from app.services.ml_client import fetch_predictions
from datetime import date


@pytest.fixture
def app():
    app = create_app()
    app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "WTF_CSRF_ENABLED": False,
        "ML_API_BASE_URL": "http://localhost:8000",
        "ML_API_KEY": "test-key",
    })
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def sample_centre(app):
    with app.app_context():
        zone = Zone(nom="Zone Test", region="Test", departement="00")
        db.session.add(zone)
        db.session.flush()
        centre = Centre(nom="Centre ML", capacite_jour=100, zone_id=zone.id)
        db.session.add(centre)
        db.session.commit()
        return centre.id


@patch("app.services.ml_client.requests.get")
def test_fetch_predictions_success(mock_get, app, sample_centre):
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = [
        {"date": date.today().isoformat(), "pred_vaccines": 80,
         "pred_emergencies": 5, "pred_vaccines_month": 2400, "confidence": 0.85}
    ]
    mock_resp.raise_for_status = MagicMock()
    mock_get.return_value = mock_resp

    with app.app_context():
        ok, msg = fetch_predictions(sample_centre)
        assert ok is True
        assert msg == "OK"
        pred = Prediction.query.filter_by(centre_id=sample_centre).first()
        assert pred is not None
        assert pred.pred_vaccines == 80


@patch("app.services.ml_client.requests.get")
def test_fetch_predictions_connection_error(mock_get, app, sample_centre):
    import requests as req
    mock_get.side_effect = req.exceptions.ConnectionError()

    with app.app_context():
        ok, msg = fetch_predictions(sample_centre)
        assert ok is False
        assert "joindre" in msg


@patch("app.services.ml_client.requests.get")
def test_fetch_predictions_timeout(mock_get, app, sample_centre):
    import requests as req
    mock_get.side_effect = req.exceptions.Timeout()

    with app.app_context():
        ok, msg = fetch_predictions(sample_centre)
        assert ok is False
        assert "temps" in msg
