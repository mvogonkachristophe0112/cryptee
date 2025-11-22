"""
User model for Cryptee application.
"""

from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, create_refresh_token
from .. import db

class User(db.Model):
    """User model with authentication and profile information."""

    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128), nullable=False)
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    profile_picture = db.Column(db.String(255))  # Path to profile picture file
    is_active = db.Column(db.Boolean, default=True, index=True)  # Index for active users
    is_email_verified = db.Column(db.Boolean, default=False, index=True)  # Index for verified users
    role = db.Column(db.String(20), default='user', index=True)  # Index for role-based queries
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)  # Index for creation date queries
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime, index=True)  # Index for last login queries
    login_attempts = db.Column(db.Integer, default=0)
    locked_until = db.Column(db.DateTime, index=True)  # Index for lock status queries
    password_reset_token = db.Column(db.String(128), unique=True, index=True)  # Index for token lookups
    password_reset_expires = db.Column(db.DateTime, index=True)  # Index for expiration queries

    # Relationships
    files = db.relationship('File', backref='owner', lazy='dynamic', cascade='all, delete-orphan')
    shares_created = db.relationship('Share', backref='creator', lazy='dynamic',
                                   foreign_keys='Share.sharer_id', cascade='all, delete-orphan')
    shares_received = db.relationship('Share', backref='recipient', lazy='dynamic',
                                    foreign_keys='Share.recipient_id')

    def __init__(self, email, username=None, password=None, first_name=None, last_name=None, role='user'):
        """Initialize user with email, username and optional password."""
        self.email = email.lower().strip()
        self.username = username or email.split('@')[0]
        self.first_name = first_name
        self.last_name = last_name
        self.role = role

        if password:
            self.set_password(password)

    def set_password(self, password):
        """Hash and set the user's password."""
        if not password or len(password) < 6:
            raise ValueError("Password must be at least 6 characters long")

        self.password_hash = generate_password_hash(password, method='scrypt')

    def check_password(self, password):
        """Verify the user's password."""
        if not self.password_hash:
            print(f"DEBUG: User {self.id} has no password_hash")
            return False

        print(f"DEBUG: Checking password for user {self.id}")
        print(f"DEBUG: Stored hash (first 20): {self.password_hash[:20] if self.password_hash else 'None'}")
        print(f"DEBUG: Input password: {password}")

        result = check_password_hash(self.password_hash, password)
        print(f"DEBUG: Password check result: {result}")
        return result

    def generate_tokens(self):
        """Generate JWT access and refresh tokens."""
        access_token = create_access_token(identity=self.id)
        refresh_token = create_refresh_token(identity=self.id)
        return access_token, refresh_token

    def is_locked(self):
        """Check if the user account is currently locked."""
        if self.locked_until and self.locked_until > datetime.utcnow():
            return True
        return False

    def increment_login_attempts(self):
        """Increment login attempts and lock account if necessary."""
        self.login_attempts += 1

        # Lock account after 5 failed attempts for 30 minutes
        if self.login_attempts >= 5:
            from datetime import timedelta
            self.locked_until = datetime.utcnow() + timedelta(minutes=30)

    def reset_login_attempts(self):
        """Reset login attempts on successful login."""
        self.login_attempts = 0
        self.locked_until = None
        self.last_login = datetime.utcnow()

    def get_full_name(self):
        """Get the user's full name."""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.first_name or self.last_name or self.email.split('@')[0]

    def generate_password_reset_token(self):
        """Generate a secure password reset token."""
        import secrets
        from datetime import timedelta

        self.password_reset_token = secrets.token_urlsafe(32)
        self.password_reset_expires = datetime.utcnow() + timedelta(hours=1)
        return self.password_reset_token

    def verify_password_reset_token(self, token):
        """Verify if the password reset token is valid."""
        if (self.password_reset_token == token and
            self.password_reset_expires and
            self.password_reset_expires > datetime.utcnow()):
            return True
        return False

    def clear_password_reset_token(self):
        """Clear the password reset token after use."""
        self.password_reset_token = None
        self.password_reset_expires = None

    def to_dict(self, include_sensitive=False):
        """Convert user to dictionary representation."""
        data = {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.get_full_name(),
            'profile_picture': self.profile_picture,
            'is_active': self.is_active,
            'is_email_verified': self.is_email_verified,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }

        if include_sensitive:
            data.update({
                'login_attempts': self.login_attempts,
                'locked_until': self.locked_until.isoformat() if self.locked_until else None
            })

        return data

    def __repr__(self):
        return f'<User {self.email}>'