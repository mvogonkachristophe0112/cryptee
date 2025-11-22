"""
Chat models for Cryptee secure messaging.
"""

from datetime import datetime
from .. import db


class ChatConversation(db.Model):
    """Chat conversation model for secure messaging between users."""

    __tablename__ = 'chat_conversations'

    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.String(64), unique=True, nullable=False, index=True)  # Unique conversation identifier
    participant1_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    participant2_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    participant1_username = db.Column(db.String(50), nullable=False)  # Cached for performance
    participant2_username = db.Column(db.String(50), nullable=False)  # Cached for performance
    last_message_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    last_message_preview = db.Column(db.String(200))  # Preview of last message
    is_active = db.Column(db.Boolean, default=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    participant1 = db.relationship('User', foreign_keys=[participant1_id], backref='chat_conversations_as_p1')
    participant2 = db.relationship('User', foreign_keys=[participant2_id], backref='chat_conversations_as_p2')

    # Messages in this conversation
    messages = db.relationship('ChatMessage', backref='conversation', lazy='dynamic', cascade='all, delete-orphan')

    def __init__(self, participant1_id, participant2_id, participant1_username, participant2_username):
        """Initialize chat conversation."""
        self.participant1_id = participant1_id
        self.participant2_id = participant2_id
        self.participant1_username = participant1_username
        self.participant2_username = participant2_username
        # Generate unique conversation ID
        import hashlib
        participants = sorted([str(participant1_id), str(participant2_id)])
        self.conversation_id = hashlib.sha256(f"{participants[0]}_{participants[1]}".encode()).hexdigest()[:16]

    def update_last_message(self, message_content, message_time=None):
        """Update the last message information."""
        self.last_message_preview = message_content[:200] if message_content else ""
        self.last_message_at = message_time or datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def get_other_participant(self, user_id):
        """Get the other participant in the conversation."""
        if user_id == self.participant1_id:
            return self.participant2
        elif user_id == self.participant2_id:
            return self.participant1
        return None

    def to_dict(self, user_id=None):
        """Convert conversation to dictionary representation."""
        data = {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'last_message_at': self.last_message_at.isoformat() if self.last_message_at else None,
            'last_message_preview': self.last_message_preview,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'message_count': self.messages.count()
        }

        # Add participant info
        if user_id:
            other_participant = self.get_other_participant(user_id)
            if other_participant:
                data['participant'] = {
                    'id': other_participant.id,
                    'username': other_participant.username,
                    'email': other_participant.email,
                    'full_name': other_participant.get_full_name()
                }

        return data


class ChatMessage(db.Model):
    """Chat message model for secure chat messaging."""

    __tablename__ = 'chat_messages'

    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('chat_conversations.id'), nullable=False, index=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    message_type = db.Column(db.String(20), default='text')  # text, file, image, system
    content = db.Column(db.Text, nullable=True)  # Message content (encrypted)
    file_path = db.Column(db.String(500))  # For file messages
    file_name = db.Column(db.String(255))  # Original file name
    file_size = db.Column(db.BigInteger)  # File size in bytes
    mime_type = db.Column(db.String(100))  # MIME type
    checksum = db.Column(db.String(128))  # File checksum
    is_read = db.Column(db.Boolean, default=False, index=True)
    is_deleted = db.Column(db.Boolean, default=False, index=True)
    expires_at = db.Column(db.DateTime, index=True)  # For disappearing messages
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    sender = db.relationship('User', foreign_keys=[sender_id], backref='sent_chat_messages')

    def __init__(self, conversation_id, sender_id, content=None, message_type='text', expires_at=None):
        """Initialize chat message."""
        self.conversation_id = conversation_id
        self.sender_id = sender_id
        self.content = content
        self.message_type = message_type
        self.expires_at = expires_at

    def mark_as_read(self):
        """Mark message as read."""
        self.is_read = True
        self.updated_at = datetime.utcnow()

    def mark_as_deleted(self):
        """Mark message as deleted (soft delete)."""
        self.is_deleted = True
        self.updated_at = datetime.utcnow()

    def is_expired(self):
        """Check if message has expired."""
        if self.expires_at and self.expires_at < datetime.utcnow():
            return True
        return False

    def to_dict(self, include_sender=True):
        """Convert message to dictionary representation."""
        data = {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'message_type': self.message_type,
            'content': self.content,
            'is_read': self.is_read,
            'is_deleted': self.is_deleted,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_expired': self.is_expired()
        }

        # Add file info if it's a file message
        if self.message_type in ['file', 'image']:
            data.update({
                'file_path': self.file_path,
                'file_name': self.file_name,
                'file_size': self.file_size,
                'mime_type': self.mime_type,
                'checksum': self.checksum
            })

        if include_sender and self.sender:
            data['sender'] = {
                'id': self.sender.id,
                'username': self.sender.username,
                'email': self.sender.email,
                'full_name': self.sender.get_full_name()
            }

        return data


class ChatTheme(db.Model):
    """Chat theme model for custom chat experiences."""

    __tablename__ = 'chat_themes'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    theme_name = db.Column(db.String(50), nullable=False)
    is_default = db.Column(db.Boolean, default=False, index=True)

    # Color scheme
    primary_color = db.Column(db.String(7), default='#2563eb')  # Hex color
    secondary_color = db.Column(db.String(7), default='#10b981')  # Hex color
    background_color = db.Column(db.String(7), default='#ffffff')  # Hex color
    text_color = db.Column(db.String(7), default='#111827')  # Hex color
    accent_color = db.Column(db.String(7), default='#f59e0b')  # Hex color

    # Font settings
    font_family = db.Column(db.String(50), default='Inter')
    font_size = db.Column(db.String(10), default='14px')

    # Message bubble styles
    bubble_style = db.Column(db.String(20), default='rounded')  # rounded, square, minimal
    show_timestamps = db.Column(db.Boolean, default=True)
    show_sender_names = db.Column(db.Boolean, default=True)

    # Background
    background_image = db.Column(db.String(500))  # Path to background image
    background_opacity = db.Column(db.Float, default=1.0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    user = db.relationship('User', backref='chat_themes')

    def __init__(self, user_id, theme_name, **kwargs):
        """Initialize chat theme."""
        self.user_id = user_id
        self.theme_name = theme_name

        # Set optional attributes
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)

    def to_dict(self):
        """Convert theme to dictionary representation."""
        return {
            'id': self.id,
            'theme_name': self.theme_name,
            'is_default': self.is_default,
            'colors': {
                'primary': self.primary_color,
                'secondary': self.secondary_color,
                'background': self.background_color,
                'text': self.text_color,
                'accent': self.accent_color
            },
            'font': {
                'family': self.font_family,
                'size': self.font_size
            },
            'appearance': {
                'bubble_style': self.bubble_style,
                'show_timestamps': self.show_timestamps,
                'show_sender_names': self.show_sender_names
            },
            'background': {
                'image': self.background_image,
                'opacity': self.background_opacity
            },
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def apply_css_variables(self):
        """Generate CSS custom properties for this theme."""
        return f"""
        --chat-primary: {self.primary_color};
        --chat-secondary: {self.secondary_color};
        --chat-background: {self.background_color};
        --chat-text: {self.text_color};
        --chat-accent: {self.accent_color};
        --chat-font-family: {self.font_family};
        --chat-font-size: {self.font_size};
        """


class ChatSettings(db.Model):
    """User chat settings model."""

    __tablename__ = 'chat_settings'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True, index=True)

    # Privacy settings
    allow_strangers = db.Column(db.Boolean, default=False)  # Allow messages from non-contacts
    show_online_status = db.Column(db.Boolean, default=True)
    read_receipts = db.Column(db.Boolean, default=True)

    # Security settings
    message_expiration_default = db.Column(db.Integer, default=0)  # Default expiration in hours (0 = never)
    encrypt_messages = db.Column(db.Boolean, default=True)

    # Notification settings
    desktop_notifications = db.Column(db.Boolean, default=True)
    sound_notifications = db.Column(db.Boolean, default=True)
    email_notifications = db.Column(db.Boolean, default=False)

    # Anti-brute force settings
    failed_attempts = db.Column(db.Integer, default=0)
    last_failed_attempt = db.Column(db.DateTime)
    locked_until = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    user = db.relationship('User', backref='chat_settings')

    def __init__(self, user_id):
        """Initialize chat settings."""
        self.user_id = user_id

    def increment_failed_attempts(self):
        """Increment failed attempts and lock if necessary."""
        self.failed_attempts += 1
        self.last_failed_attempt = datetime.utcnow()

        # Lock chat after 10 failed attempts for 1 hour
        if self.failed_attempts >= 10:
            from datetime import timedelta
            self.locked_until = datetime.utcnow() + timedelta(hours=1)

    def reset_failed_attempts(self):
        """Reset failed attempts on successful action."""
        self.failed_attempts = 0
        self.last_failed_attempt = None
        self.locked_until = None

    def is_locked(self):
        """Check if chat is currently locked."""
        if self.locked_until and self.locked_until > datetime.utcnow():
            return True
        return False

    def to_dict(self):
        """Convert settings to dictionary representation."""
        return {
            'allow_strangers': self.allow_strangers,
            'show_online_status': self.show_online_status,
            'read_receipts': self.read_receipts,
            'message_expiration_default': self.message_expiration_default,
            'encrypt_messages': self.encrypt_messages,
            'desktop_notifications': self.desktop_notifications,
            'sound_notifications': self.sound_notifications,
            'email_notifications': self.email_notifications,
            'is_locked': self.is_locked(),
            'failed_attempts': self.failed_attempts
        }