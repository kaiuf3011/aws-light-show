#!/usr/bin/env bash
# One-command deploy. Run this inside AWS CloudShell (or any machine with AWS CLI + SAM CLI).
#   ./deploy.sh                 -> deploy everything (backend + website)
#   NO_CDN=1 ./deploy.sh        -> skip CloudFront (use if your new account can't create CloudFront yet)
#   ./deploy.sh web             -> only re-upload the website (fast, after editing web/ files)
set -euo pipefail
cd "$(dirname "$0")"

STACK="${STACK:-aws-light-show}"
REGION="${AWS_REGION:-ap-south-1}"   # Mumbai, closest region to Coimbatore
USE_CF=$([ "${NO_CDN:-0}" = "1" ] && echo false || echo true)

bold() { printf '\033[1m%s\033[0m\n' "$*"; }

if [ ! -s .adminkey ]; then
  # (no early-closing pipe here: with 'set -o pipefail' that would silently stop the script)
  openssl rand -hex 6 > .adminkey 2>/dev/null || date +%s%N | sha256sum | cut -c1-12 > .adminkey
fi
KEY="$(cat .adminkey)"

if [ "${1:-}" != "web" ]; then
  bold "☁️  Deploying backend to $REGION (first time takes ~5 min because of CloudFront)…"
  sam deploy \
    --template-file template.yaml \
    --stack-name "$STACK" \
    --region "$REGION" \
    --resolve-s3 \
    --capabilities CAPABILITY_IAM \
    --parameter-overrides "AdminKey=$KEY" "UseCloudFront=$USE_CF" \
    --no-confirm-changeset \
    --no-fail-on-empty-changeset
fi

out() {
  aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}
WS_URL="$(out WebSocketURL)"
SITE_URL="$(out SiteURL)"
BUCKET="$(out SiteBucketName)"
DIST="$(out DistributionId)"

bold "🌐 Uploading website…"
printf 'window.WS_URL = "%s";\n' "$WS_URL" > web/config.js
aws s3 sync web "s3://$BUCKET" --delete --region "$REGION" --cache-control "max-age=60"
if [ "$DIST" != "none" ] && [ -n "$DIST" ]; then
  aws cloudfront create-invalidation --distribution-id "$DIST" --paths "/*" >/dev/null
fi

echo
bold "✅ DONE! Save these links:"
echo "   📱 Phones (QR code points here):  $SITE_URL/"
echo "   🖥️  Big screen (TV / projector):    $SITE_URL/screen.html"
echo "   🖨️  Printable QR poster:            $SITE_URL/qr.html"
echo "   🎛️  Your control panel:             $SITE_URL/control.html?key=$KEY"
echo "   🔑 Admin key:                      $KEY"
echo
echo "   (Don't share the control panel link: anyone with it can control the show.)"
