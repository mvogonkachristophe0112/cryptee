"""
File version model for Cryptee application.
Manages file versioning and history.
"""

from datetime import datetime
from .. import db


class FileVersion(db.Model):
    """File version model for tracking file changes and history."""

    __tablename__ = 'file_versions'

    id = db.Column(db.Integer, primary_key=True)
    file_id = db.Column(db.Integer, db.ForeignKey('files.id'), nullable=False, index=True)

    # Version information
    version_number = db.Column(db.Integer, nullable=False)  # 1, 2, 3, etc.
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.BigInteger, nullable=False)
    mime_type = db.Column(db.String(100))

    # Storage information
    storage_path = db.Column(db.String(500), nullable=False)
    checksum = db.Column(db.String(128), nullable=False, index=True)  # SHA-256 hash

    # Encryption metadata (if applicable)
    encryption_iv = db.Column(db.String(32))  # Base64 encoded IV
    encryption_salt = db.Column(db.String(32))  # Base64 encoded salt

    # Version metadata
    change_description = db.Column(db.Text)  # User-provided description of changes
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)

    # Relationships
    file = db.relationship('File', backref=db.backref('versions', lazy='dynamic', order_by='FileVersion.version_number.desc()'))
    creator = db.relationship('User', backref=db.backref('file_versions', lazy='dynamic'))

    def __init__(self, file_id, version_number, filename, original_filename, file_size,
                 mime_type, storage_path, checksum, created_by, change_description=None,
                 encryption_iv=None, encryption_salt=None):
        self.file_id = file_id
        self.version_number = version_number
        self.filename = filename
        self.original_filename = original_filename
        self.file_size = file_size
        self.mime_type = mime_type
        self.storage_path = storage_path
        self.checksum = checksum
        self.created_by = created_by
        self.change_description = change_description
        self.encryption_iv = encryption_iv
        self.encryption_salt = encryption_salt

    @property
    def file_exists(self):
        """Check if the physical file exists."""
        import os
        return os.path.exists(self.storage_path)

    @property
    def size_mb(self):
        """Get file size in MB."""
        return round(self.file_size / (1024 * 1024), 2)

    @property
    def is_encrypted(self):
        """Check if version has encryption metadata."""
        return self.encryption_iv is not None and self.encryption_salt is not None

    def to_dict(self, include_path=False):
        """Convert file version to dictionary representation."""
        data = {
            'id': self.id,
            'file_id': self.file_id,
            'version_number': self.version_number,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'file_size': self.file_size,
            'size_mb': self.size_mb,
            'mime_type': self.mime_type,
            'checksum': self.checksum,
            'change_description': self.change_description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by,
            'is_encrypted': self.is_encrypted,
            'creator_name': self.creator.get_full_name() if self.creator else None
        }

        if include_path:
            data['storage_path'] = self.storage_path

        return data

    def __repr__(self):
        return f'<FileVersion {self.file_id}v{self.version_number} ({self.original_filename})>'