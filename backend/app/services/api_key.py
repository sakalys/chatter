from uuid import UUID

import boto3
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import logging
import base64

from app.core.config import settings
from app.models.api_key import ApiKey
from app.schemas.api_key import ApiKeyCreate, ApiKeyUpdate

# Configure logger
logger = logging.getLogger(__name__)

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
    db: AsyncSession, 
    api_key_id: UUID, 
    user_id: UUID
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
    # Always encrypt the API key using AWS KMS
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
    try:
        logger.info(f"Attempting to encrypt API key using KMS key: {settings.aws_kms_key_id}")
        # Create KMS client
        kms = boto3.client(
            'kms',
            region_name=settings.aws_region,
            endpoint_url=settings.aws_endpoint_url,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )
        
        # Encrypt the API key
        response = kms.encrypt(
            KeyId=settings.aws_kms_key_id,
            Plaintext=api_key.encode('utf-8')
        )
        
        # Get the encrypted key reference and encode it as base64
        encrypted_key = base64.b64encode(response['CiphertextBlob']).decode('utf-8')
        
        # Log the first few characters for debugging
        logger.info(f"Successfully encrypted API key (first 5 chars): {encrypted_key[:5]}...")
        
        return encrypted_key
    except Exception as e:
        logger.error(f"Error encrypting API key with KMS: {e}")
        logger.error(f"KMS configuration: region={settings.aws_region}, endpoint={settings.aws_endpoint_url}, key_id={settings.aws_kms_key_id}")
        raise


def decrypt_api_key(encrypted_key_reference: str) -> str:
    """
    Decrypt an API key using AWS KMS.
    
    Args:
        encrypted_key_reference: Encrypted API key reference
        
    Returns:
        Decrypted API key
    """
    try:
        logger.info(f"Attempting to decrypt API key using KMS key: {settings.aws_kms_key_id}")
        # Create KMS client
        kms = boto3.client(
            'kms',
            region_name=settings.aws_region,
            endpoint_url=settings.aws_endpoint_url,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )
        
        # Decode the base64 encrypted key
        try:
            encrypted_data = base64.b64decode(encrypted_key_reference)
        except Exception as e:
            logger.error(f"Error decoding base64 data: {e}")
            raise
        
        # Decrypt the key reference
        response = kms.decrypt(
            CiphertextBlob=encrypted_data,
            KeyId=settings.aws_kms_key_id
        )
        
        # Get the decrypted key
        decrypted_key = response['Plaintext'].decode('utf-8')
        
        # Log the first few characters for debugging
        logger.info(f"Successfully decrypted API key with KMS (first 5 chars): {decrypted_key[:5]}...")
        
        return decrypted_key
    except Exception as e:
        logger.error(f"Error decrypting API key with KMS: {e}")
        logger.error(f"KMS configuration: region={settings.aws_region}, endpoint={settings.aws_endpoint_url}, key_id={settings.aws_kms_key_id}")
        raise
