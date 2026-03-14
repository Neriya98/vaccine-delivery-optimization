from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required, current_user
from app.models.user import User

auth_bp = Blueprint("auth", __name__, template_folder="templates")

@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return _redirect_by_role(current_user.role)
    if request.method == "POST":
        email    = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        user     = User.query.filter_by(email=email).first()
        if user and user.check_password(password):
            login_user(user, remember=True)
            flash(f"Bienvenue, {user.nom or user.email} !", "success")
            return _redirect_by_role(user.role)
        flash("Email ou mot de passe incorrect.", "danger")
    return render_template("auth/login.html")

@auth_bp.route("/logout")
@login_required
def logout():
    logout_user()
    flash("Déconnexion réussie.", "info")
    return redirect(url_for("auth.login"))

def _redirect_by_role(role):
    destinations = {"centre": "centre.dashboard", "zone": "zone.dashboard", "decideur": "decideur.dashboard"}
    return redirect(url_for(destinations.get(role, "auth.login")))
