import requests
from flask import current_app
from datetime import date
from app import db
from app.models.prediction import Prediction

def fetch_predictions(centre_id: int, days_ahead: int = 7) -> tuple[bool, str]:
    base_url = current_app.config["ML_API_BASE_URL"]
    api_key  = current_app.config["ML_API_KEY"]
    today    = date.today()
    try:
        resp = requests.get(
            f"{base_url}/predict",
            params={"centre_id": centre_id, "date_start": today.isoformat(), "days_ahead": days_ahead},
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
    except requests.exceptions.ConnectionError:
        return False, "Impossible de joindre l'API ML."
    except requests.exceptions.Timeout:
        return False, "L'API ML n'a pas répondu à temps."
    except requests.exceptions.HTTPError as e:
        return False, f"Erreur API ML : {e}"
    except Exception as e:
        return False, str(e)

    for item in data:
        d = date.fromisoformat(item["date"])
        pred = Prediction.query.filter_by(centre_id=centre_id, date=d).first()
        if pred:
            pred.pred_vaccines       = item.get("pred_vaccines")
            pred.pred_emergencies    = item.get("pred_emergencies")
            pred.pred_vaccines_month = item.get("pred_vaccines_month")
            pred.confidence          = item.get("confidence")
        else:
            db.session.add(Prediction(
                centre_id=centre_id, date=d,
                pred_vaccines=item.get("pred_vaccines"),
                pred_emergencies=item.get("pred_emergencies"),
                pred_vaccines_month=item.get("pred_vaccines_month"),
                confidence=item.get("confidence"),
            ))
    db.session.commit()
    return True, "OK"

def fetch_all_predictions():
    from app.models.centre import Centre
    return {c.id: dict(zip(["ok","msg"], fetch_predictions(c.id))) for c in Centre.query.all()}
