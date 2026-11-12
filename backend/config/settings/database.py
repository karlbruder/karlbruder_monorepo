from pydantic_settings import BaseSettings
from sqlalchemy.engine import URL


class DatabaseSettings(BaseSettings):
    # Domain database
    DB_ENGINE: str = "postgresql"
    DB_DRIVER: str = "psycopg"
    DB_USER: str
    DB_PASSWORD: str
    DB_HOST: str
    DB_PORT: int = 5432
    DB_NAME: str

    # Auth database
    AUTH_DB_USER: str
    AUTH_DB_PASSWORD: str
    AUTH_DB_HOST: str
    AUTH_DB_PORT: int = 5432
    AUTH_DB_NAME: str

    def get_database_url(self) -> str:
        """Build the domain database URL from host, name, user, and password."""
        return self._build_database_url(
            username=self.DB_USER,
            password=self.DB_PASSWORD,
            host=self.DB_HOST,
            port=self.DB_PORT,
            database=self.DB_NAME,
        )

    def get_auth_database_url(self) -> str:
        """Build the Auth database URL for diagnostics and current-email lookup."""
        return self._build_database_url(
            username=self.AUTH_DB_USER,
            password=self.AUTH_DB_PASSWORD,
            host=self.AUTH_DB_HOST,
            port=self.AUTH_DB_PORT,
            database=self.AUTH_DB_NAME,
        )

    def _build_database_url(
        self,
        username: str,
        password: str,
        host: str,
        port: int,
        database: str,
    ) -> str:
        return URL.create(
            drivername=f"{self.DB_ENGINE}+{self.DB_DRIVER}",
            username=username,
            password=password,
            host=host,
            port=port,
            database=database,
        ).render_as_string(hide_password=False)
