"""
Client-side encryption utilities for Cryptee application.
Uses Web Crypto API compatible encryption for end-to-end security.
"""

import os
import base64
import secrets
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import logging

logger = logging.getLogger(__name__)


class FileEncryption:
    """Handle file encryption/decryption operations."""

    @staticmethod
    def generate_key(password, salt=None):
        """Generate encryption key from password using PBKDF2."""
        if salt is None:
            salt = secrets.token_bytes(16)  # 128-bit salt

        # Use PBKDF2 with SHA-256
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,  # 256-bit key
            salt=salt,
            iterations=100000,  # High iteration count for security
            backend=default_backend()
        )

        key = kdf.derive(password.encode('utf-8'))
        return key, salt

    @staticmethod
    def encrypt_file(file_data, password):
        """Encrypt file data with AES-256-GCM."""
        try:
            # Generate key and salt
            key, salt = FileEncryption.generate_key(password)

            # Generate random IV (96 bits for GCM)
            iv = secrets.token_bytes(12)

            # Create cipher
            cipher = Cipher(algorithms.AES(key), modes.GCM(iv), backend=default_backend())
            encryptor = cipher.encryptor()

            # Encrypt the data
            ciphertext = encryptor.update(file_data) + encryptor.finalize()

            # Get authentication tag
            tag = encryptor.tag

            # Combine IV + tag + ciphertext
            encrypted_data = iv + tag + ciphertext

            # Return encrypted data and salt (needed for decryption)
            return encrypted_data, base64.b64encode(salt).decode('utf-8')

        except Exception as e:
            logger.error(f"File encryption failed: {str(e)}")
            raise

    @staticmethod
    def decrypt_file(encrypted_data, password, salt_b64):
        """Decrypt file data with AES-256-GCM."""
        try:
            # Decode salt
            salt = base64.b64decode(salt_b64)

            # Generate key from password and salt
            key, _ = FileEncryption.generate_key(password, salt)

            # Extract IV (first 12 bytes), tag (next 16 bytes), and ciphertext
            iv = encrypted_data[:12]
            tag = encrypted_data[12:28]
            ciphertext = encrypted_data[28:]

            # Create cipher
            cipher = Cipher(algorithms.AES(key), modes.GCM(iv, tag), backend=default_backend())
            decryptor = cipher.decryptor()

            # Decrypt the data
            plaintext = decryptor.update(ciphertext) + decryptor.finalize()

            return plaintext

        except Exception as e:
            logger.error(f"File decryption failed: {str(e)}")
            raise ValueError("Decryption failed. Please check your password.")

    @staticmethod
    def generate_share_key():
        """Generate a random key for file sharing."""
        return secrets.token_urlsafe(32)

    @staticmethod
    def encrypt_with_key(file_data, key):
        """Encrypt file data with a pre-shared key."""
        try:
            # Decode base64 key if needed
            if isinstance(key, str):
                key = base64.b64decode(key)

            # Ensure key is 32 bytes
            if len(key) != 32:
                # If key is shorter, pad it; if longer, truncate
                if len(key) < 32:
                    key = key + b'\x00' * (32 - len(key))
                else:
                    key = key[:32]

            # Generate random IV
            iv = secrets.token_bytes(12)

            # Create cipher
            cipher = Cipher(algorithms.AES(key), modes.GCM(iv), backend=default_backend())
            encryptor = cipher.encryptor()

            # Encrypt the data
            ciphertext = encryptor.update(file_data) + encryptor.finalize()

            # Get authentication tag
            tag = encryptor.tag

            # Combine IV + tag + ciphertext
            encrypted_data = iv + tag + ciphertext

            return encrypted_data

        except Exception as e:
            logger.error(f"Key-based encryption failed: {str(e)}")
            raise

    @staticmethod
    def decrypt_with_key(encrypted_data, key):
        """Decrypt file data with a pre-shared key."""
        try:
            # Decode base64 key if needed
            if isinstance(key, str):
                key = base64.b64decode(key)

            # Ensure key is 32 bytes
            if len(key) != 32:
                if len(key) < 32:
                    key = key + b'\x00' * (32 - len(key))
                else:
                    key = key[:32]

            # Extract IV (first 12 bytes), tag (next 16 bytes), and ciphertext
            iv = encrypted_data[:12]
            tag = encrypted_data[12:28]
            ciphertext = encrypted_data[28:]

            # Create cipher
            cipher = Cipher(algorithms.AES(key), modes.GCM(iv, tag), backend=default_backend())
            decryptor = cipher.decryptor()

            # Decrypt the data
            plaintext = decryptor.update(ciphertext) + decryptor.finalize()

            return plaintext

        except Exception as e:
            logger.error(f"Key-based decryption failed: {str(e)}")
            raise ValueError("Decryption failed. Invalid key or corrupted data.")


class WebCryptoCompatible:
    """Utilities for Web Crypto API compatibility."""

    @staticmethod
    def generate_web_crypto_key():
        """Generate a key compatible with Web Crypto API."""
        # Generate 256-bit key
        key = secrets.token_bytes(32)
        return base64.b64encode(key).decode('utf-8')

    @staticmethod
    def web_crypto_encrypt_info():
        """Return encryption parameters compatible with Web Crypto API."""
        return {
            'algorithm': 'AES-GCM',
            'key_length': 256,
            'iv_length': 12,  # 96 bits
            'tag_length': 16   # 128 bits
        }

    @staticmethod
    def validate_encryption_metadata(iv_b64, salt_b64):
        """Validate encryption metadata format."""
        try:
            # Validate IV (should be 12 bytes when decoded)
            iv = base64.b64decode(iv_b64)
            if len(iv) != 12:
                return False, "Invalid IV length"

            # Validate salt (should be 16 bytes when decoded)
            salt = base64.b64decode(salt_b64)
            if len(salt) != 16:
                return False, "Invalid salt length"

            return True, "Valid"
        except Exception as e:
            return False, f"Invalid base64 encoding: {str(e)}"


# Convenience functions
def encrypt_file_data(file_data, password):
    """Convenience function for file encryption."""
    return FileEncryption.encrypt_file(file_data, password)


def decrypt_file_data(encrypted_data, password, salt):
    """Convenience function for file decryption."""
    return FileEncryption.decrypt_file(encrypted_data, password, salt)


def generate_encryption_key():
    """Generate a new encryption key."""
    return FileEncryption.generate_share_key()


def validate_encryption_params(iv, salt):
    """Validate encryption parameters."""
    return WebCryptoCompatible.validate_encryption_metadata(iv, salt)