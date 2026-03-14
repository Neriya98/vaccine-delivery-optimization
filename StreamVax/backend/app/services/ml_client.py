import os
import random
from datetime import date, timedelta
from pathlib import Path
from app import db
from app.models.prediction import Prediction


def fetch_predictions(centre_id: int, days_ahead: int = 7) -> tuple[bool, str]:
    use_mock = os.environ.get("ML_USE_MOCK", "true").lower() == "true"
    if use_mock:
        data = _mock_predict(centre_id, days_ahead)
    else:
        ok, result = _real_predict(centre_id, days_ahead)
        if not ok:
            return False, result
        data = result
    _save_predictions(centre_id, data)
    return True, "OK"


def _mock_predict(centre_id: int, days_ahead: int) -> list[dict]:
    random.seed(centre_id)
    base_vaccines    = random.randint(60, 150)
    base_emergencies = random.randint(5, 30)
    today   = date.today()
    results = []
    for i in range(days_ahead):
        d         = today + timedelta(days=i)
        variation = random.uniform(0.85, 1.15)
        results.append({
            "date":                 d.isoformat(),
            "pred_vaccines":        int(base_vaccines * variation),
            "pred_emergencies":     int(base_emergencies * variation),
            "pred_vaccines_month":  int(base_vaccines * 30 * variation),
            "confidence":           round(random.uniform(0.72, 0.94), 2),
        })
    return results


def _real_predict(centre_id: int, days_ahead: int) -> tuple[bool, list | str]:
    """
    À compléter quand la team ML livre le model.pkl.
    Le modèle doit retourner pour chaque jour :
    [pred_vaccines, pred_emergencies, confidence]
    """
    try:
        import pickle
        import pandas as pd
        import sys
        from pathlib import Path

        # Ajoute la racine du projet au path pour importer vaccine_route_optimization
        project_root = Path(__file__).resolve().parents[4]
        if str(project_root) not in sys.path:
            sys.path.insert(0, str(project_root))

        from vaccine_route_optimization.config import MODELS_DIR, PROCESSED_DATA_DIR

        model_path    = Path(MODELS_DIR) / "model.pkl"
        features_path = Path(PROCESSED_DATA_DIR) / "test_features.csv"

        if not model_path.exists():
            return False, f"model.pkl introuvable dans {MODELS_DIR}"
        if not features_path.exists():
            return False, f"test_features.csv introuvable dans {PROCESSED_DATA_DIR}"

        with open(model_path, "rb") as f:
            model = pickle.load(f)

        df        = pd.read_csv(features_path)
        df_centre = df[df["centre_id"] == centre_id]

        if df_centre.empty:
            return False, f"Aucune feature pour centre_id={centre_id}"

        predictions_raw = model.predict(df_centre)

        today   = date.today()
        results = []
        for i, pred in enumerate(predictions_raw[:days_ahead]):
            pred = list(pred) if hasattr(pred, '__iter__') else [pred, 0, 0.8]
            results.append({
                "date":                 (today + timedelta(days=i)).isoformat(),
                "pred_vaccines":        int(pred[0]) if len(pred) > 0 else 0,
                "pred_emergencies":     int(pred[1]) if len(pred) > 1 else 0,
                "pred_vaccines_month":  int(pred[0] * 30) if len(pred) > 0 else 0,
                "confidence":           float(pred[2]) if len(pred) > 2 else 0.8,
            })
        return True, results

    except Exception as e:
        return False, f"Erreur modèle : {str(e)}"


def _save_predictions(centre_id: int, data: list[dict]):
    for item in data:
        d    = date.fromisoformat(item["date"])
        pred = Prediction.query.filter_by(centre_id=centre_id, date=d).first()
        if pred:
            pred.pred_vaccines       = item.get("pred_vaccines")
            pred.pred_emergencies    = item.get("pred_emergencies")
            pred.pred_vaccines_month = item.get("pred_vaccines_month")
            pred.confidence          = item.get("confidence")
        else:
            db.session.add(Prediction(
                centre_id=centre_id,
                date=d,
                pred_vaccines=item.get("pred_vaccines"),
                pred_emergencies=item.get("pred_emergencies"),
                pred_vaccines_month=item.get("pred_vaccines_month"),
                confidence=item.get("confidence"),
            ))
    db.session.commit()


def fetch_all_predictions():
    from app.models.centre import Centre
    return {
        c.id: dict(zip(["ok", "msg"], fetch_predictions(c.id)))
        for c in Centre.query.all()
    }
