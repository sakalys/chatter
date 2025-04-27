#!/bin/bash
set -e

# Use localstack service name instead of localhost
LOCALSTACK_HOST=${LOCALSTACK_HOST:-"localstack"}
LOCALSTACK_URL="http://${LOCALSTACK_HOST}:4566"

echo "Waiting for LocalStack to be ready at ${LOCALSTACK_URL}..."
until curl -s "${LOCALSTACK_URL}/_localstack/health" 2>/dev/null | grep -q '"kms": "\(available\|running\)"'; do
  echo "Waiting for KMS service..."
  sleep 2
done

echo "LocalStack KMS is ready, initializing..."

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

# Debug: Show AWS configuration
echo "Debug: AWS Configuration"
echo "AWS_REGION=$AWS_REGION"
echo "AWS_DEFAULT_REGION=$AWS_DEFAULT_REGION"
echo "ENDPOINT_URL=$ENDPOINT_URL"
cat ~/.aws/config
cat ~/.aws/credentials

# Function to check if alias exists
check_alias() {
  /usr/local/bin/aws --endpoint-url="${ENDPOINT_URL}" kms list-aliases --query "Aliases[?AliasName=='alias/chat-api-keys']" --output text 2>/dev/null | grep -q "alias/chat-api-keys"
}

# If alias already exists, we're done
if check_alias; then
  echo "KMS alias 'alias/chat-api-keys' already exists"
  exit 0
fi

# Create KMS key with retries
MAX_RETRIES=5
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  echo "Creating KMS key (attempt $((RETRY_COUNT + 1))/${MAX_RETRIES})..."
  
  # Add debug output
  echo "Debug: Running aws command with endpoint ${ENDPOINT_URL}"
  /usr/local/bin/aws --endpoint-url="${ENDPOINT_URL}" kms list-keys 2>&1 || echo "List keys failed (expected during first run)"
  
  KEY_ID=$(/usr/local/bin/aws --endpoint-url="${ENDPOINT_URL}" kms create-key \
    --description "Chat API Keys" \
    --key-usage ENCRYPT_DECRYPT \
    --origin AWS_KMS \
    --query 'KeyMetadata.KeyId' \
    --output text 2>/dev/null || echo "")

  if [ -n "$KEY_ID" ]; then
    echo "Created KMS key with ID: $KEY_ID"
    break
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
    echo "Failed to create KMS key, retrying in 2 seconds..."
    sleep 2
  fi
done

if [ -z "$KEY_ID" ]; then
  echo "Failed to create KMS key after ${MAX_RETRIES} attempts"
  exit 1
fi

# Create alias for the key with retries
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  echo "Creating KMS key alias (attempt $((RETRY_COUNT + 1))/${MAX_RETRIES})..."
  
  if /usr/local/bin/aws --endpoint-url="${ENDPOINT_URL}" kms create-alias \
    --alias-name alias/chat-api-keys \
    --target-key-id "$KEY_ID" 2>/dev/null; then
    break
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
    echo "Failed to create alias, retrying in 2 seconds..."
    sleep 2
  fi
done

# Final verification
if ! check_alias; then
  echo "Failed to verify KMS alias creation"
  exit 1
fi

echo "KMS setup complete!" 