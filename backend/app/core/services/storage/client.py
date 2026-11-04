import boto3
from botocore.config import Config

from config.env import AWS_REGION, IS_LOCAL_ENV


def build_s3_client(*, endpoint_url: str | None):
    region_name = AWS_REGION
    if IS_LOCAL_ENV and endpoint_url:
        return boto3.client(
            "s3",
            region_name=region_name,
            endpoint_url=endpoint_url,
            config=Config(s3={"addressing_style": "path"}),
        )
    return boto3.client("s3", region_name=region_name)
