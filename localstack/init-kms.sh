#!/bin/bash

# Wait for LocalStack to be ready
echo "Waiting for LocalStack to be ready..."
while ! curl -s http://localhost:4566/_localstack/health | grep -q '"kms": "available"'; do
  sleep 1
done

# Set AWS environment variables
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_REGION=us-east-1
export ENDPOINT_URL=http://localhost:4566

# Create KMS key
echo "Creating KMS key..."
KEY_ID=$(aws --endpoint-url=$ENDPOINT_URL kms create-key \
  --description "Chat API Keys" \
  --key-usage ENCRYPT_DECRYPT \
  --origin AWS_KMS \
  --query 'KeyMetadata.KeyId' \
  --output text)

if [ $? -ne 0 ]; then
  echo "Failed to create KMS key"
  exit 1
fi

echo "Created KMS key with ID: $KEY_ID"

# Create alias for the key
echo "Creating KMS key alias..."
aws --endpoint-url=$ENDPOINT_URL kms create-alias \
  --alias-name alias/chat-api-keys \
  --target-key-id $KEY_ID

if [ $? -ne 0 ]; then
  echo "Failed to create KMS key alias"
  exit 1
fi

echo "KMS setup complete!" 