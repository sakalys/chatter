from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from cryptography.fernet import Fernet

from app.core.config import settings
from app.models.api_key import ApiKey
from app.schemas.api_key import ApiKeyCreate, ApiKeyUpdate

# Configure logger
logger = logging.getLogger(__name__)

# Initialize Fernet cipher suite
cipher_suite = Fernet(settings.secret_key)

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


async def get_users_api_key_by_id(
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
    # Encrypt the API key using symmetric encryption
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
    Encrypt an API key using symmetric encryption.
    
    Args:
        api_key: Plain text API key
        
    Returns:
        Encrypted API key reference
    """
    try:
        logger.debug("Attempting to encrypt API key using symmetric encryption")
        encrypted_key = cipher_suite.encrypt(api_key.encode('utf-8')).decode('utf-8')
        logger.debug(f"Successfully encrypted API key (first 5 chars): {encrypted_key[:5]}...")
        return encrypted_key
    except Exception as e:
        logger.error(f"Error encrypting API key: {e}")
        raise


def decrypt_api_key(encrypted_key_reference: str) -> str:
    """
    Decrypt an API key using symmetric encryption.
    
    Args:
        encrypted_key_reference: Encrypted API key reference
        
    Returns:
        Decrypted API key
    """
    try:
        logger.debug("Attempting to decrypt API key using symmetric encryption")
        decrypted_key = cipher_suite.decrypt(encrypted_key_reference.encode('utf-8')).decode('utf-8')
        logger.debug(f"Successfully decrypted API key (first 5 chars): {decrypted_key[:5]}...")
        return decrypted_key
    except Exception as e:
        logger.error(f"Error decrypting API key: {e}")
        raise
