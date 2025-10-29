Place your Aiven CA certificate here as `aiven-ca.pem`.

How to obtain:
- In Aiven Console, open your MySQL service → Overview → Connection information → CA certificate → Download.

Then ensure your backend/.env points to:
DB_SSL_CA=backend/certs/aiven-ca.pem

Note: SQLAlchemy typically passes SSL CA via `connect_args={"ssl": {"ca": "/path/to/aiven-ca.pem"}}` when creating the engine.
