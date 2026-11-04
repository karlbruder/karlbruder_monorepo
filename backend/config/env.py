import os
from datetime import datetime

from app import __version__

# Read before a settings instance exists so the package can choose a settings class.
APP_NAME = os.getenv("APP_NAME", "karlbruder")

ENV_NAME = os.getenv("ENV_NAME", "local").lower()

CONTAINER_NAME = os.getenv("CONTAINER_NAME", APP_NAME).lower()

AWS_REGION = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION", "us-east-2")

SECRET_NAME = os.getenv("SECRET_NAME") or None

GIT_SHA = os.getenv("GIT_SHA", "NaN")

RELEASED_AT = os.getenv("RELEASED_AT", datetime.now().isoformat())

VERSION = __version__

IS_LOCAL_ENV = ENV_NAME in ("local", "test")

IS_CLOUD_ENV = not IS_LOCAL_ENV
