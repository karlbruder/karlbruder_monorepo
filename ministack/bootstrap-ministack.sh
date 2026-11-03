#!/bin/sh

set -eu

stack_name="ministack-aws-emulator"
template_path="/etc/localstack/init/ministack-aws-emulator-stack.yml"
endpoint_url="http://localhost:4566"
region_name="${AWS_DEFAULT_REGION:-us-east-2}"

if aws \
    --endpoint-url "$endpoint_url" \
    --region "$region_name" \
    cloudformation describe-stacks \
    --stack-name "$stack_name" >/dev/null 2>&1
then
    exit 0
fi

aws \
    --endpoint-url "$endpoint_url" \
    --region "$region_name" \
    cloudformation create-stack \
    --stack-name "$stack_name" \
    --template-body "file://$template_path"
