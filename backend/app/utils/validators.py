"""
Input validation and sanitization utilities for Cryptee application.
"""

import re
import bleach
from typing import Optional, Tuple
from werkzeug.utils import secure_filename


def validate_email(email: str) -> Tuple[bool, str]:
    """
    Validate email address format and basic requirements.

    Args:
        email: Email address to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not email or not isinstance(email, str):
        return False, "Email is required"

    email = email.strip().lower()

    if len(email) > 254:  # RFC 5321 limit
        return False, "Email address is too long"

    # Basic email regex pattern
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

    if not re.match(pattern, email):
        return False, "Invalid email format"

    return True, ""


def validate_password(password: str) -> Tuple[bool, str]:
    """
    Validate password strength requirements.

    Args:
        password: Password to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not password or not isinstance(password, str):
        return False, "Password is required"

    if len(password) < 8:
        return False, "Password must be at least 8 characters long"

    if len(password) > 128:
        return False, "Password must be less than 128 characters long"

    # Check for required character types
    has_upper = bool(re.search(r'[A-Z]', password))
    has_lower = bool(re.search(r'[a-z]', password))
    has_digit = bool(re.search(r'\d', password))
    has_special = bool(re.search(r'[!@#$%^&*(),.?":{}|<>]', password))

    if not (has_upper and has_lower and has_digit):
        return False, "Password must contain uppercase, lowercase, and numeric characters"

    # Optional: Check for common weak passwords
    weak_passwords = [
        'password', '123456', 'qwerty', 'admin', 'letmein',
        'welcome', 'monkey', 'password1', 'abc123'
    ]

    if password.lower() in weak_passwords:
        return False, "Password is too common, please choose a stronger password"

    return True, ""


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent path traversal and other security issues.

    Args:
        filename: Original filename

    Returns:
        Sanitized filename
    """
    if not filename:
        return "unnamed_file"

    # Use Werkzeug's secure_filename as base
    sanitized = secure_filename(filename)

    # Additional sanitization
    # Remove any remaining dangerous characters
    sanitized = re.sub(r'[<>:"/\\|?*]', '', sanitized)

    # Ensure filename is not empty after sanitization
    if not sanitized:
        sanitized = "unnamed_file"

    # Limit filename length
    if len(sanitized) > 255:
        name, ext = sanitized.rsplit('.', 1) if '.' in sanitized else (sanitized, '')
        max_name_len = 250 - len(ext) - 1 if ext else 250
        sanitized = name[:max_name_len] + (f".{ext}" if ext else "")

    return sanitized


def sanitize_text(text: str, max_length: int = 1000) -> str:
    """
    Sanitize text input to prevent XSS and other injection attacks.

    Args:
        text: Text to sanitize
        max_length: Maximum allowed length

    Returns:
        Sanitized text
    """
    if not text:
        return ""

    # Limit length first
    if len(text) > max_length:
        text = text[:max_length]

    # Use bleach to clean HTML and prevent XSS
    cleaned = bleach.clean(text, strip=True)

    # Additional sanitization - remove control characters
    cleaned = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', cleaned)

    return cleaned.strip()


def validate_file_size(file_size: int, max_size: int = 104857600) -> Tuple[bool, str]:
    """
    Validate file size against maximum allowed size.

    Args:
        file_size: File size in bytes
        max_size: Maximum allowed size in bytes (default 100MB)

    Returns:
        Tuple of (is_valid, error_message)
    """
    if file_size <= 0:
        return False, "File size must be greater than 0"

    if file_size > max_size:
        max_mb = max_size / (1024 * 1024)
        return False, f"File size exceeds maximum allowed size of {max_mb:.1f}MB"

    return True, ""


def validate_share_link(share_link: str) -> Tuple[bool, str]:
    """
    Validate share link format.

    Args:
        share_link: Share link to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not share_link or not isinstance(share_link, str):
        return False, "Share link is required"

    # Share links should be URL-safe base64 encoded strings
    if not re.match(r'^[A-Za-z0-9_-]+$', share_link):
        return False, "Invalid share link format"

    if len(share_link) < 10 or len(share_link) > 100:
        return False, "Share link has invalid length"

    return True, ""


def validate_expiration_days(days: int) -> Tuple[bool, str]:
    """
    Validate share expiration days.

    Args:
        days: Number of days

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not isinstance(days, int) or days < 1:
        return False, "Expiration days must be a positive integer"

    if days > 365:  # Maximum 1 year
        return False, "Expiration cannot exceed 365 days"

    return True, ""


def validate_download_limit(limit: int) -> Tuple[bool, str]:
    """
    Validate download limit.

    Args:
        limit: Download limit (-1 for unlimited)

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not isinstance(limit, int):
        return False, "Download limit must be an integer"

    if limit < -1:
        return False, "Download limit cannot be negative (use -1 for unlimited)"

    if limit > 10000:  # Reasonable upper limit
        return False, "Download limit cannot exceed 10,000"

    return True, ""