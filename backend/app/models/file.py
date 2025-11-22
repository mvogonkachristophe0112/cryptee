"""
File model for Cryptee application.
"""

import os
import secrets
from datetime import datetime
from .. import db

class File(db.Model):
    """File model for storing encrypted file metadata."""

    __tablename__ = 'files'

    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.BigInteger, nullable=False)
    mime_type = db.Column(db.String(100))
    checksum = db.Column(db.String(128), nullable=False, index=True)  # SHA-256 hash
    storage_path = db.Column(db.String(500), nullable=False)
    encryption_iv = db.Column(db.String(32))  # Base64 encoded IV for AES
    encryption_salt = db.Column(db.String(32))  # Base64 encoded salt for key derivation

    # Foreign keys
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)

    # Metadata
    upload_date = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    last_accessed = db.Column(db.DateTime)
    is_deleted = db.Column(db.Boolean, default=False)
    deleted_at = db.Column(db.DateTime)

    # Relationships
    shares = db.relationship('Share', backref='file', lazy='dynamic', cascade='all, delete-orphan')

    def __init__(self, user_id, filename, original_filename, file_size, mime_type,
                 checksum, storage_path, encryption_iv=None, encryption_salt=None):
        """Initialize file with metadata."""
        self.user_id = user_id
        self.filename = filename
        self.original_filename = original_filename
        self.file_size = file_size
        self.mime_type = mime_type
        self.checksum = checksum
        self.storage_path = storage_path
        self.encryption_iv = encryption_iv
        self.encryption_salt = encryption_salt

    @property
    def file_exists(self):
        """Check if the physical file exists."""
        return os.path.exists(self.storage_path)

    @property
    def size_mb(self):
        """Get file size in MB."""
        return round(self.file_size / (1024 * 1024), 2)

    @property
    def is_encrypted(self):
        """Check if file has encryption metadata."""
        return self.encryption_iv is not None and self.encryption_salt is not None

    def mark_accessed(self):
        """Update last accessed timestamp."""
        self.last_accessed = datetime.utcnow()

    def soft_delete(self):
        """Mark file as deleted without removing from database."""
        self.is_deleted = True
        self.deleted_at = datetime.utcnow()

    def restore(self):
        """Restore a soft-deleted file."""
        self.is_deleted = False
        self.deleted_at = None

    def generate_secure_filename(self, original_filename):
        """Generate a secure filename to prevent path traversal attacks."""
        # Get file extension
        _, ext = os.path.splitext(original_filename)

        # Generate random filename
        random_name = secrets.token_hex(16)

        # Combine with extension
        return f"{random_name}{ext}"

    def get_share_count(self):
        """Get the number of active shares for this file."""
        return self.shares.filter_by(is_active=True).count()

    def to_dict(self, include_path=False):
        """Convert file to dictionary representation."""
        data = {
            'id': self.id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'file_size': self.file_size,
            'size_mb': self.size_mb,
            'mime_type': self.mime_type,
            'checksum': self.checksum,
            'upload_date': self.upload_date.isoformat() if self.upload_date else None,
            'last_accessed': self.last_accessed.isoformat() if self.last_accessed else None,
            'is_encrypted': self.is_encrypted,
            'is_deleted': self.is_deleted,
            'share_count': self.get_share_count(),
            'user_id': self.user_id
        }

        if include_path:
            data['storage_path'] = self.storage_path

        return data

    def __repr__(self):
        return f'<File {self.original_filename} ({self.size_mb}MB)>'