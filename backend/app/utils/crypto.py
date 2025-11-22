"""
Cryptographic utilities for Cryptee application.
Handles file encryption/decryption and key management.
"""

import os
import hashlib
import secrets
from typing import Tuple, Optional
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.exceptions import InvalidKey, InvalidTag
import base64


def generate_key(password: str, salt: bytes = None, iterations: int = 100000) -> Tuple[bytes, bytes]:
    """
    Generate encryption key from password using PBKDF2.

    Args:
        password: User password
        salt: Salt bytes (generated if None)
        iterations: Number of PBKDF2 iterations

    Returns:
        Tuple of (key, salt)
    """
    if salt is None:
        salt = secrets.token_bytes(32)

    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=iterations,
        backend=default_backend()
    )

    key = kdf.derive(password.encode('utf-8'))
    return key, salt


def generate_iv() -> bytes:
    """Generate a random initialization vector for AES."""
    return secrets.token_bytes(16)


def encrypt_file(file_path: str, key: bytes, output_path: str = None) -> Tuple[str, str, str]:
    """
    Encrypt a file using AES-256-GCM.

    Args:
        file_path: Path to file to encrypt
        key: Encryption key (32 bytes)
        output_path: Output path (optional, defaults to input_path + '.encrypted')

    Returns:
        Tuple of (output_path, iv_b64, tag_b64)
    """
    if not output_path:
        output_path = file_path + '.encrypted'

    iv = generate_iv()

    # Initialize cipher
    cipher = Cipher(algorithms.AES(key), modes.GCM(iv), backend=default_backend())
    encryptor = cipher.encryptor()

    # Read and encrypt file
    with open(file_path, 'rb') as f_in, open(output_path, 'wb') as f_out:
        while True:
            chunk = f_in.read(64 * 1024)  # 64KB chunks
            if not chunk:
                break
            encrypted_chunk = encryptor.update(chunk)
            f_out.write(encrypted_chunk)

        # Finalize encryption
        f_out.write(encryptor.finalize())

    # Get authentication tag
    tag = encryptor.tag

    # Convert to base64 for storage
    iv_b64 = base64.b64encode(iv).decode('utf-8')
    tag_b64 = base64.b64encode(tag).decode('utf-8')

    return output_path, iv_b64, tag_b64


def decrypt_file(encrypted_path: str, key: bytes, iv_b64: str, tag_b64: str, output_path: str = None) -> str:
    """
    Decrypt a file encrypted with AES-256-GCM.

    Args:
        encrypted_path: Path to encrypted file
        key: Decryption key (32 bytes)
        iv_b64: Base64 encoded initialization vector
        tag_b64: Base64 encoded authentication tag
        output_path: Output path (optional, defaults to removing '.encrypted' extension)

    Returns:
        Output path of decrypted file

    Raises:
        ValueError: If decryption fails
    """
    if not output_path:
        if encrypted_path.endswith('.encrypted'):
            output_path = encrypted_path[:-10]  # Remove '.encrypted'
        else:
            output_path = encrypted_path + '.decrypted'

    # Decode IV and tag
    try:
        iv = base64.b64decode(iv_b64)
        tag = base64.b64decode(tag_b64)
    except Exception as e:
        raise ValueError(f"Invalid IV or tag encoding: {e}")

    # Initialize cipher
    cipher = Cipher(algorithms.AES(key), modes.GCM(iv, tag), backend=default_backend())
    decryptor = cipher.decryptor()

    try:
        # Read and decrypt file
        with open(encrypted_path, 'rb') as f_in, open(output_path, 'wb') as f_out:
            while True:
                chunk = f_in.read(64 * 1024)  # 64KB chunks
                if not chunk:
                    break
                decrypted_chunk = decryptor.update(chunk)
                f_out.write(decrypted_chunk)

            # Finalize decryption
            f_out.write(decryptor.finalize())

    except (InvalidKey, InvalidTag) as e:
        # Clean up failed decryption
        if os.path.exists(output_path):
            os.remove(output_path)
        raise ValueError(f"Decryption failed - invalid key or corrupted file: {e}")
    except Exception as e:
        # Clean up on any other error
        if os.path.exists(output_path):
            os.remove(output_path)
        raise ValueError(f"Decryption failed: {e}")

    return output_path


def calculate_checksum(file_path: str) -> str:
    """
    Calculate SHA-256 checksum of a file.

    Args:
        file_path: Path to file

    Returns:
        Hexadecimal checksum string
    """
    hash_sha256 = hashlib.sha256()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_sha256.update(chunk)
    return hash_sha256.hexdigest()


def verify_checksum(file_path: str, expected_checksum: str) -> bool:
    """
    Verify file integrity against expected checksum.

    Args:
        file_path: Path to file
        expected_checksum: Expected SHA-256 checksum

    Returns:
        True if checksums match, False otherwise
    """
    actual_checksum = calculate_checksum(file_path)
    return actual_checksum == expected_checksum


def generate_secure_token(length: int = 32) -> str:
    """
    Generate a secure random token.

    Args:
        length: Token length in bytes

    Returns:
        URL-safe base64 encoded token
    """
    return secrets.token_urlsafe(length)


def hash_password(password: str) -> str:
    """
    Hash password using bcrypt.

    Args:
        password: Plain text password

    Returns:
        Hashed password string
    """
    from werkzeug.security import generate_password_hash
    return generate_password_hash(password, method='bcrypt')


def verify_password(password_hash: str, password: str) -> bool:
    """
    Verify password against hash.

    Args:
        password_hash: Hashed password
        password: Plain text password

    Returns:
        True if password matches hash
    """
    from werkzeug.security import check_password_hash
    return check_password_hash(password_hash, password)