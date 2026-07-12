# Database migrations

This project uses Flask-Migrate/Alembic.

Initialize once:

```bash
flask --app application db init
```

Create a migration after model changes:

```bash
flask --app application db migrate -m "initial schema"
```

Apply migrations in production:

```bash
flask --app application db upgrade
```

Do not commit local database files or secrets.
