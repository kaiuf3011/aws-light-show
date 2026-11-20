#!/usr/bin/env bash
# Deletes everything this project created in AWS (run after the event to avoid any cost).
set -euo pipefail
cd "$(dirname "$0")"
STACK="${STACK:-aws-light-show}"
REGION="${AWS_REGION:-ap-south-1}"

BUCKET="$(aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='SiteBucketName'].OutputValue" --output text 2>/dev/null || true)"
if [ -n "$BUCKET" ] && [ "$BUCKET" != "None" ]; then
  echo "Emptying bucket $BUCKET…"
  aws s3 rm "s3://$BUCKET" --recursive --region "$REGION" || true
fi
echo "Deleting stack $STACK… (CloudFront takes a few minutes)"
aws cloudformation delete-stack --stack-name "$STACK" --region "$REGION"
aws cloudformation wait stack-delete-complete --stack-name "$STACK" --region "$REGION"
echo "✅ All AWS resources deleted."
