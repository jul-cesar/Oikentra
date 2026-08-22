#!/bin/sh
set -e

POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
AUTH_DATABASE="${AUTH_DATABASE:-oikentra_auth}"
BUSINESS_DATABASE="${BUSINESS_DATABASE:-oikentra_business}"

export PGPASSWORD="$POSTGRES_PASSWORD"

echo "[migrations] Esperando a PostgreSQL en $POSTGRES_HOST..."
until pg_isready -h "$POSTGRES_HOST" -U "$POSTGRES_USER" >/dev/null 2>&1; do
	sleep 1
done
echo "[migrations] PostgreSQL listo."

create_db_if_missing() {
	db_name="$1"
	exists=$(psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -tc "SELECT 1 FROM pg_database WHERE datname = '$db_name';" | xargs)
	if [ "$exists" = "1" ]; then
		echo "[migrations] Base de datos '$db_name' ya existe."
	else
		echo "[migrations] Creando base de datos '$db_name'..."
		psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -c "CREATE DATABASE $db_name;"
	fi
}

create_db_if_missing "$AUTH_DATABASE"
create_db_if_missing "$BUSINESS_DATABASE"

echo "[migrations] Corriendo migraciones de auth-service..."
cd /workspace/apps/auth-service
export DATABASE_URL="postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:5432/$AUTH_DATABASE"
pnpm run db:migrate

echo "[migrations] Corriendo migraciones de business-service..."
cd /workspace/apps/business-service
export DATABASE_URL="postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:5432/$BUSINESS_DATABASE"
pnpm run db:migrate

echo "[migrations] Migraciones completadas exitosamente."
