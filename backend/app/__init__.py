from flask import Flask
from flask_cors import CORS

from .api.routes import api
from .config import Config
from .extensions import db, jwt, migrate, socketio
from .models import core as _core_models


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    CORS(app, resources={r"/api/*": {"origins": app.config["FRONTEND_ORIGIN"]}})
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    socketio.init_app(app, cors_allowed_origins=app.config["FRONTEND_ORIGIN"])

    app.register_blueprint(api, url_prefix="/api")
    return app
