#!/bin/sh

set -eu

stack_name="ministack-aws-emulator"
template_path="/etc/localstack/init/ministack-aws-emulator-stack.yml"
endpoint_url="http://localhost:4566"
region_name="${AWS_DEFAULT_REGION:-us-east-2}"
bucket_name="kb-local-bucket"

if ! aws \
    --endpoint-url "$endpoint_url" \
    --region "$region_name" \
    cloudformation describe-stacks \
    --stack-name "$stack_name" >/dev/null 2>&1
then
    aws \
        --endpoint-url "$endpoint_url" \
        --region "$region_name" \
        cloudformation create-stack \
        --stack-name "$stack_name" \
        --template-body "file://$template_path"
fi

attempts=0
until aws \
    --endpoint-url "$endpoint_url" \
    --region "$region_name" \
    s3api head-bucket \
    --bucket "$bucket_name" >/dev/null 2>&1
do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 30 ]; then
        echo "bucket ${bucket_name} was not created" >&2
        exit 1
    fi
    sleep 1
done

aws \
    --endpoint-url "$endpoint_url" \
    --region "$region_name" \
    s3api put-bucket-cors \
    --bucket "$bucket_name" \
    --cors-configuration '{
      "CORSRules": [
        {
          "AllowedOrigins": ["http://localhost:5173"],
          "AllowedMethods": ["PUT"],
          "AllowedHeaders": ["Content-Type"],
          "MaxAgeSeconds": 3000
        }
      ]
    }'
