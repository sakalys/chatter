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

# Configure AWS CLI
mkdir -p ~/.aws
cat > ~/.aws/config << EOL
[default]
region = us-east-1
output = json
endpoint_url = http://localhost:4566
EOL

cat > ~/.aws/credentials << EOL
[default]
aws_access_key_id = test
aws_secret_access_key = test
EOL

echo "Verifying KMS setup..."

# Check if LocalStack is running
if ! curl -s "${LOCALSTACK_URL}/_localstack/health" 2>/dev/null | grep -q '"kms": "\(available\|running\)"'; then
  echo "Error: LocalStack KMS service is not available"
  exit 1
fi

echo "✓ LocalStack KMS service is running"

# Check if alias exists
if ! /usr/local/bin/aws kms list-aliases --query "Aliases[?AliasName=='alias/chat-api-keys']" --output text 2>/dev/null | grep -q "alias/chat-api-keys"; then
  echo "KMS alias 'alias/chat-api-keys' not found..."
  exit 1
  
else
  # Get the key ID from the alias
  KEY_ID=$(/usr/local/bin/aws kms describe-key --key-id alias/chat-api-keys --query 'KeyMetadata.KeyId' --output text 2>/dev/null)

  if [ -z "$KEY_ID" ]; then
    echo "Error: Could not retrieve key ID from alias"
    exit 1
  fi

  echo "Found existing KMS key ID: $KEY_ID"
fi

echo "✓ KMS alias exists"
echo "✓ Key ID is valid"

# Test encryption/decryption
echo "Testing encryption/decryption..."
TEST_DATA="test123"
ENCODED_DATA=$(echo -n "$TEST_DATA" | base64)

# Try encryption with retries
MAX_RETRIES=3
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  ENCRYPTED=$(/usr/local/bin/aws kms encrypt \
    --key-id alias/chat-api-keys \
    --plaintext "$ENCODED_DATA" \
    --query 'CiphertextBlob' \
    --output text 2>/dev/null || echo "")

  if [ -n "$ENCRYPTED" ]; then
    break
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
    echo "Encryption attempt failed, retrying in 2 seconds..."
    sleep 2
  fi
done

if [ -z "$ENCRYPTED" ]; then
  echo "Error: Encryption failed after ${MAX_RETRIES} attempts"
  exit 1
fi

# Try decryption with retries
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  DECRYPTED=$(/usr/local/bin/aws kms decrypt \
    --ciphertext-blob "$ENCRYPTED" \
    --query 'Plaintext' \
    --output text 2>/dev/null | base64 -d || echo "")

  if [ -n "$DECRYPTED" ] && [ "$DECRYPTED" = "$TEST_DATA" ]; then
    break
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
    echo "Decryption attempt failed, retrying in 2 seconds..."
    sleep 2
  fi
done

if [ -z "$DECRYPTED" ] || [ "$DECRYPTED" != "$TEST_DATA" ]; then
  echo "Error: Decryption failed or data mismatch"
  echo "Expected: $TEST_DATA"
  echo "Got: $DECRYPTED"
  exit 1
fi

echo "✓ Encryption/decryption works correctly"
echo "KMS verification successful!" 