from uuid import UUID

import boto3
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.api_key import ApiKey
from app.schemas.api_key import ApiKeyCreate, ApiKeyUpdate


async def get_api_keys_by_user(
    db: AsyncSession, user_id: UUID
) -> list[ApiKey]:
    """
    Get all API keys for a user.
    
    Args:
        db: Database session
        user_id: User ID
        
    Returns:
        List of API key objects
    """
    result = await db.execute(select(ApiKey).where(ApiKey.user_id == user_id))
    return result.scalars().all()


async def get_api_key_by_id(
    db: AsyncSession, api_key_id: UUID, user_id: UUID
) -> ApiKey | None:
    """
    Get an API key by ID for a specific user.
    
    Args:
        db: Database session
        api_key_id: API key ID
        user_id: User ID
        
    Returns:
        API key object or None if not found
    """
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.id == api_key_id,
            ApiKey.user_id == user_id
        )
    )
    return result.scalars().first()


async def create_api_key(
    db: AsyncSession, api_key_in: ApiKeyCreate, user_id: UUID
) -> ApiKey:
    """
    Create a new API key.
    
    Args:
        db: Database session
        api_key_in: API key creation data
        user_id: User ID
        
    Returns:
        Created API key object
    """
    # Encrypt the API key using AWS KMS
    key_reference = encrypt_api_key(api_key_in.key)
    
    api_key = ApiKey(
        user_id=user_id,
        provider=api_key_in.provider,
        key_reference=key_reference,
        name=api_key_in.name,
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)
    return api_key


async def update_api_key(
    db: AsyncSession, api_key: ApiKey, api_key_in: ApiKeyUpdate
) -> ApiKey:
    """
    Update an API key.
    
    Args:
        db: Database session
        api_key: API key object to update
        api_key_in: API key update data
        
    Returns:
        Updated API key object
    """
    update_data = api_key_in.model_dump(exclude_unset=True)
    
    if "key" in update_data and update_data["key"]:
        # Encrypt the new API key
        update_data["key_reference"] = encrypt_api_key(update_data.pop("key"))
    
    for field, value in update_data.items():
        setattr(api_key, field, value)
    
    await db.commit()
    await db.refresh(api_key)
    return api_key


async def delete_api_key(
    db: AsyncSession, api_key: ApiKey
) -> None:
    """
    Delete an API key.
    
    Args:
        db: Database session
        api_key: API key object to delete
    """
    await db.delete(api_key)
    await db.commit()


def encrypt_api_key(api_key: str) -> str:
    """
    Encrypt an API key using AWS KMS.
    
    Args:
        api_key: Plain text API key
        
    Returns:
        Encrypted API key reference
    """
    # Create KMS client
    kms_client = boto3.client(
        'kms',
        region_name=settings.aws_region,
        endpoint_url=settings.aws_endpoint_url,  # For LocalStack in development
        aws_access_key_id=settings.aws_access_key_id,  # For LocalStack
        aws_secret_access_key=settings.aws_secret_access_key,  # For LocalStack
    )
    
    # In a real production environment, you would use a KMS key that you've created
    # For LocalStack, we'll create a key if it doesn't exist
    if settings.env == "development":
        # Check if we have a key alias already
        try:
            response = kms_client.describe_key(KeyId='alias/chat-platform-key')
            key_id = response['KeyMetadata']['KeyId']
        except Exception:
            # Create a new key
            response = kms_client.create_key(
                Description='Chat Platform API Key Encryption Key',
                KeyUsage='ENCRYPT_DECRYPT',
                Origin='AWS_KMS',
            )
            key_id = response['KeyMetadata']['KeyId']
            
            # Create an alias for the key
            kms_client.create_alias(
                AliasName='alias/chat-platform-key',
                TargetKeyId=key_id,
            )
    else:
        # In production, use a pre-created key
        key_id = 'alias/chat-platform-key'
    
    # Encrypt the API key
    response = kms_client.encrypt(
        KeyId=key_id,
        Plaintext=api_key.encode('utf-8'),
    )
    
    # Return the encrypted key as a base64-encoded string
    import base64
    return base64.b64encode(response['CiphertextBlob']).decode('utf-8')


def decrypt_api_key(encrypted_key_reference: str) -> str:
    """
    Decrypt an API key using AWS KMS.
    
    Args:
        encrypted_key_reference: Encrypted API key reference
        
    Returns:
        Decrypted API key
    """
    # Create KMS client
    kms_client = boto3.client(
        'kms',
        region_name=settings.aws_region,
        endpoint_url=settings.aws_endpoint_url,  # For LocalStack in development
        aws_access_key_id=settings.aws_access_key_id,  # For LocalStack
        aws_secret_access_key=settings.aws_secret_access_key,  # For LocalStack
    )
    
    # Decode the base64-encoded encrypted key
    import base64
    encrypted_key = base64.b64decode(encrypted_key_reference)
    
    # Decrypt the API key
    response = kms_client.decrypt(
        CiphertextBlob=encrypted_key,
    )
    
    # Return the decrypted key as a string
    return response['Plaintext'].decode('utf-8')
