from app import create_app, db
from flask import redirect, url_for
from app.models.user import User
from app.models.zone import Zone
from app.models.centre import Centre

app = create_app()

@app.route("/")
def index():
    return redirect(url_for("auth.login"))

@app.shell_context_processor
def make_shell_context():
    return {"db": db, "User": User, "Zone": Zone, "Centre": Centre}

@app.cli.command("seed")
def seed_db():
    """Insère des données de test."""
    z = Zone(nom="Zone Île-de-France", region="Île-de-France", departement="75")
    db.session.add(z)
    db.session.flush()

    c1 = Centre(nom="Centre Paris 15", adresse="15 rue X", latitude=48.84, longitude=2.29,
                capacite_jour=120, zone_id=z.id)
    c2 = Centre(nom="Centre Paris 10", adresse="10 bd Y", latitude=48.87, longitude=2.36,
                capacite_jour=80, zone_id=z.id)
    db.session.add_all([c1, c2])
    db.session.flush()

    for email, nom, role, cid, zid in [
        ("centre@demo.fr",  "Agent Centre", "centre",   c1.id, None),
        ("zone@demo.fr",    "Point Focal",  "zone",     None,  z.id),
        ("decideur@demo.fr","Ministre",     "decideur", None,  None),
    ]:
        u = User(email=email, nom=nom, role=role, centre_id=cid, zone_id=zid)
        u.set_password("demo1234")
        db.session.add(u)

    db.session.commit()
    print("Seed OK — 1 zone, 2 centres, 3 utilisateurs (mot de passe : demo1234)")

if __name__ == "__main__":
    app.run(debug=True)
