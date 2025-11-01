from extensions import db


class ApiUsage(db.Model):
    __tablename__ = 'api_usage'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    endpoint = db.Column(db.String(128), nullable=False)
    count = db.Column(db.Integer, nullable=False, default=0)
    last_used_at = db.Column(db.DateTime, server_default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    user = db.relationship('User')
    __table_args__ = (
        db.UniqueConstraint('user_id', 'endpoint', name='uq_api_usage_user_endpoint'),
    )


class GameSession(db.Model):
    __tablename__ = 'game_sessions'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    topic = db.Column(db.String(100))
    difficulty = db.Column(db.String(20))
    model = db.Column(db.String(100))

    tokens_prompt = db.Column(db.Integer, nullable=False, default=0)
    tokens_completion = db.Column(db.Integer, nullable=False, default=0)
    tokens_total = db.Column(db.Integer, nullable=False, default=0)

    words_count = db.Column(db.Integer)
    placed_words = db.Column(db.Integer)
    grid_size = db.Column(db.Integer)

    # Store compact JSON/text snapshots (optional)
    words_json = db.Column(db.Text)
    definitions_json = db.Column(db.Text)
    grid_json = db.Column(db.Text)

    started_at = db.Column(db.DateTime, server_default=db.func.current_timestamp())
    finished_at = db.Column(db.DateTime)
    duration_ms = db.Column(db.Integer)
    status = db.Column(db.String(20), default='completed')

    user = db.relationship('User')


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(32), nullable=False, unique=True, index=True)
    email = db.Column(db.String(255), nullable=False, unique=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, server_default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())


class PasswordReset(db.Model):
    __tablename__ = 'password_resets'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    token_hash = db.Column(db.String(64), unique=True, index=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, server_default=db.func.current_timestamp())

    user = db.relationship('User')
