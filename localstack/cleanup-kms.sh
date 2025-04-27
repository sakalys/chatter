#!/bin/bash
set -e

# Use localstack service name instead of localhost
LOCALSTACK_HOST=${LOCALSTACK_HOST:-"localstack"}
LOCALSTACK_URL="http://${LOCALSTACK_HOST}:4566"

# Set AWS environment variables
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_REGION=us-east-1
export AWS_DEFAULT_REGION=us-east-1
export ENDPOINT_URL="${LOCALSTACK_URL}"

# Configure AWS CLI
mkdir -p ~/.aws
cat > ~/.aws/config << EOL
[default]
region = us-east-1
output = json
EOL

cat > ~/.aws/credentials << EOL
[default]
aws_access_key_id = test
aws_secret_access_key = test
EOL

echo "Cleaning up KMS resources..."

# Wait for KMS service to be available
echo "Waiting for LocalStack KMS service to be ready..."
MAX_RETRIES=5
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -s "${LOCALSTACK_URL}/_localstack/health" 2>/dev/null | grep -q '"kms": "\(available\|running\)"'; then
    echo "LocalStack KMS service is ready"
    break
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
    echo "Waiting for KMS service (attempt $((RETRY_COUNT + 1))/${MAX_RETRIES})..."
    sleep 2
  else
    echo "Error: LocalStack KMS service is not available after ${MAX_RETRIES} attempts"
    exit 1
  fi
done

# Check if alias exists
if ! /usr/local/bin/aws --endpoint-url="${ENDPOINT_URL}" kms list-aliases --query "Aliases[?AliasName=='alias/chat-api-keys']" --output text 2>/dev/null | grep -q "alias/chat-api-keys"; then
  echo "KMS alias 'alias/chat-api-keys' not found, nothing to clean up"
  exit 0
fi

# Get the key ID from the alias
KEY_ID=$(/usr/local/bin/aws --endpoint-url="${ENDPOINT_URL}" kms describe-key --key-id alias/chat-api-keys --query 'KeyMetadata.KeyId' --output text 2>/dev/null)

if [ -z "$KEY_ID" ]; then
  echo "Error: Could not retrieve key ID from alias"
  exit 1
fi

echo "Found KMS key ID: $KEY_ID"

# Delete the alias first
echo "Deleting KMS alias..."
if ! /usr/local/bin/aws --endpoint-url="${ENDPOINT_URL}" kms delete-alias --alias-name alias/chat-api-keys 2>/dev/null; then
  echo "Error: Failed to delete KMS alias"
  exit 1
fi

# Schedule the key for deletion
echo "Scheduling KMS key for deletion..."
if ! /usr/local/bin/aws --endpoint-url="${ENDPOINT_URL}" kms schedule-key-deletion --key-id "$KEY_ID" --pending-window-in-days 7 2>/dev/null; then
  echo "Error: Failed to schedule KMS key for deletion"
  exit 1
fi

echo "KMS cleanup completed successfully" 