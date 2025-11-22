"""
Message model for Cryptee secure messaging.
"""

from datetime import datetime
from .. import db


class Message(db.Model):
    """Message model for secure messaging between users."""

    __tablename__ = 'messages'

    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    recipient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    subject = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=False)
    message_type = db.Column(db.String(20), default='text')  # text, file, contact, etc.
    is_read = db.Column(db.Boolean, default=False)
    is_deleted = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    sender = db.relationship('User', foreign_keys=[sender_id], backref='sent_messages')
    recipient = db.relationship('User', foreign_keys=[recipient_id], backref='received_messages')

    # Attachments (one-to-many relationship)
    attachments = db.relationship('MessageAttachment', backref='message', cascade='all, delete-orphan')

    def __init__(self, sender_id, recipient_id, subject, content, message_type='text'):
        """Initialize message."""
        self.sender_id = sender_id
        self.recipient_id = recipient_id
        self.subject = subject
        self.content = content
        self.message_type = message_type

    def to_dict(self, include_sender=True, include_recipient=True):
        """Convert message to dictionary representation."""
        data = {
            'id': self.id,
            'subject': self.subject,
            'content': self.content,
            'message_type': self.message_type,
            'is_read': self.is_read,
            'is_deleted': self.is_deleted,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'attachments': [attachment.to_dict() for attachment in self.attachments]
        }

        if include_sender and self.sender:
            data['sender'] = {
                'id': self.sender.id,
                'username': self.sender.username,
                'email': self.sender.email
            }

        if include_recipient and self.recipient:
            data['recipient'] = {
                'id': self.recipient.id,
                'username': self.recipient.username,
                'email': self.recipient.email
            }

        return data

    def mark_as_read(self):
        """Mark message as read."""
        self.is_read = True
        self.updated_at = datetime.utcnow()

    def mark_as_deleted(self):
        """Mark message as deleted (soft delete)."""
        self.is_deleted = True
        self.updated_at = datetime.utcnow()


class MessageAttachment(db.Model):
    """Message attachment model for files attached to messages."""

    __tablename__ = 'message_attachments'

    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('messages.id'), nullable=False, index=True)
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.BigInteger, nullable=False)
    mime_type = db.Column(db.String(100))
    storage_path = db.Column(db.String(500), nullable=False)
    checksum = db.Column(db.String(128), nullable=False)
    attachment_type = db.Column(db.String(20), default='file')  # file, image, video, audio, contact
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, message_id, filename, original_filename, file_size, mime_type, storage_path, checksum, attachment_type='file'):
        """Initialize message attachment."""
        self.message_id = message_id
        self.filename = filename
        self.original_filename = original_filename
        self.file_size = file_size
        self.mime_type = mime_type
        self.storage_path = storage_path
        self.checksum = checksum
        self.attachment_type = attachment_type

    def to_dict(self):
        """Convert attachment to dictionary representation."""
        return {
            'id': self.id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'file_size': self.file_size,
            'mime_type': self.mime_type,
            'storage_path': self.storage_path,
            'checksum': self.checksum,
            'attachment_type': self.attachment_type,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Contact(db.Model):
    """Contact model for sharing contact information."""

    __tablename__ = 'contacts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120))
    phone = db.Column(db.String(20))
    company = db.Column(db.String(100))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    user = db.relationship('User', backref='contacts')

    def __init__(self, user_id, name, email=None, phone=None, company=None, notes=None):
        """Initialize contact."""
        self.user_id = user_id
        self.name = name
        self.email = email
        self.phone = phone
        self.company = company
        self.notes = notes

    def to_dict(self):
        """Convert contact to dictionary representation."""
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'company': self.company,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }