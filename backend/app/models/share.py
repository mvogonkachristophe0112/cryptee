"""
Share model for Cryptee application.
"""

import secrets
from datetime import datetime, timedelta
from .. import db

class Share(db.Model):
    """Share model for managing file sharing links and permissions."""

    __tablename__ = 'shares'

    id = db.Column(db.Integer, primary_key=True)
    share_link = db.Column(db.String(64), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128))  # Optional password protection
    is_active = db.Column(db.Boolean, default=True)

    # Expiration and limits
    expires_at = db.Column(db.DateTime)
    max_downloads = db.Column(db.Integer, default=-1)  # -1 = unlimited
    download_count = db.Column(db.Integer, default=0)

    # Advanced security features
    unlock_time = db.Column(db.DateTime)  # Time lock - can only access after this time
    is_one_time = db.Column(db.Boolean, default=False)  # One-time access only
    device_fingerprint = db.Column(db.String(256))  # One device only - store device fingerprint

    # Geofencing
    allowed_countries = db.Column(db.JSON)  # List of allowed country codes
    allowed_cities = db.Column(db.JSON)  # List of allowed cities
    center_lat = db.Column(db.Float)  # Geographic center latitude
    center_lng = db.Column(db.Float)  # Geographic center longitude
    max_distance_km = db.Column(db.Float)  # Maximum distance from center in km

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_accessed = db.Column(db.DateTime)

    # Foreign keys
    file_id = db.Column(db.Integer, db.ForeignKey('files.id'), nullable=False, index=True)
    sharer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    recipient_id = db.Column(db.Integer, db.ForeignKey('users.id'), index=True)  # Optional specific recipient

    def __init__(self, file_id, sharer_id, expires_at=None, max_downloads=-1,
                 password=None, recipient_id=None, unlock_time=None, is_one_time=False,
                 device_fingerprint=None, allowed_countries=None, allowed_cities=None,
                 center_lat=None, center_lng=None, max_distance_km=None):
        """Initialize share with file and user information."""
        self.file_id = file_id
        self.sharer_id = sharer_id
        self.recipient_id = recipient_id
        self.max_downloads = max_downloads

        # Advanced security features
        self.unlock_time = unlock_time
        self.is_one_time = is_one_time
        self.device_fingerprint = device_fingerprint
        self.allowed_countries = allowed_countries or []
        self.allowed_cities = allowed_cities or []
        self.center_lat = center_lat
        self.center_lng = center_lng
        self.max_distance_km = max_distance_km

        # Generate unique share link
        self.share_link = self._generate_share_link()

        # Set expiration (default 7 days if not specified)
        if expires_at:
            self.expires_at = expires_at
        else:
            self.expires_at = datetime.utcnow() + timedelta(days=7)

        # Set password if provided
        if password:
            from werkzeug.security import generate_password_hash
            self.password_hash = generate_password_hash(password, method='bcrypt')

    def _generate_share_link(self):
        """Generate a unique share link."""
        while True:
            link = secrets.token_urlsafe(32)
            if not Share.query.filter_by(share_link=link).first():
                return link

    @property
    def is_expired(self):
        """Check if the share has expired."""
        return self.expires_at and self.expires_at < datetime.utcnow()

    @property
    def downloads_remaining(self):
        """Get the number of downloads remaining."""
        if self.max_downloads == -1:
            return -1  # Unlimited
        return max(0, self.max_downloads - self.download_count)

    @property
    def can_download(self):
        """Check if downloads are still allowed."""
        if not self.is_active:
            return False
        if self.is_expired:
            return False
        if self.max_downloads != -1 and self.download_count >= self.max_downloads:
            return False
        return True

    @property
    def is_time_locked(self):
        """Check if the share is time-locked."""
        return self.unlock_time and self.unlock_time > datetime.utcnow()

    @property
    def time_until_unlock(self):
        """Get time remaining until unlock (in seconds)."""
        if not self.is_time_locked:
            return 0
        return int((self.unlock_time - datetime.utcnow()).total_seconds())

    def check_geofence(self, user_lat=None, user_lng=None, user_country=None, user_city=None):
        """Check if user location is within geofence restrictions."""
        # If no geofence restrictions set, allow access
        if not any([self.allowed_countries, self.allowed_cities, self.center_lat, self.center_lng]):
            return True, "No geofence restrictions"

        # Check country restriction
        if self.allowed_countries and user_country:
            if user_country.upper() not in [c.upper() for c in self.allowed_countries]:
                return False, f"Access not allowed from {user_country}"

        # Check city restriction
        if self.allowed_cities and user_city:
            if user_city not in self.allowed_cities:
                return False, f"Access not allowed from {user_city}"

        # Check distance restriction
        if self.center_lat and self.center_lng and self.max_distance_km and user_lat and user_lng:
            distance = self._calculate_distance(self.center_lat, self.center_lng, user_lat, user_lng)
            if distance > self.max_distance_km:
                return False, f"Access not allowed from this location ({distance:.1f}km away)"

        return True, "Location allowed"

    def check_device_access(self, device_fingerprint):
        """Check if device is allowed to access this share."""
        if not self.device_fingerprint:
            return True, "No device restriction"

        if self.device_fingerprint != device_fingerprint:
            return False, "Access not allowed from this device"

        return True, "Device allowed"

    def _calculate_distance(self, lat1, lng1, lat2, lng2):
        """Calculate distance between two points using Haversine formula."""
        import math

        # Convert to radians
        lat1_rad = math.radians(lat1)
        lng1_rad = math.radians(lng1)
        lat2_rad = math.radians(lat2)
        lng2_rad = math.radians(lng2)

        # Haversine formula
        dlat = lat2_rad - lat1_rad
        dlng = lng2_rad - lng1_rad

        a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlng/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

        # Earth's radius in kilometers
        R = 6371
        return R * c

    def check_password(self, password):
        """Verify share password if set."""
        if not self.password_hash:
            return True  # No password required

        from werkzeug.security import check_password_hash
        return check_password_hash(self.password_hash, password)

    def record_download(self):
        """Record a successful download."""
        self.download_count += 1
        self.last_accessed = datetime.utcnow()

        # If one-time access, revoke the share after download
        if self.is_one_time:
            self.revoke()

    def revoke(self):
        """Revoke the share link."""
        self.is_active = False

    def extend_expiry(self, days=7):
        """Extend the share expiration date."""
        if self.expires_at:
            self.expires_at = self.expires_at + timedelta(days=days)
        else:
            self.expires_at = datetime.utcnow() + timedelta(days=days)

    def to_dict(self, include_sensitive=False):
        """Convert share to dictionary representation."""
        data = {
            'id': self.id,
            'share_link': self.share_link,
            'is_active': self.is_active,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'max_downloads': self.max_downloads,
            'download_count': self.download_count,
            'downloads_remaining': self.downloads_remaining,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_accessed': self.last_accessed.isoformat() if self.last_accessed else None,
            'file_id': self.file_id,
            'sharer_id': self.sharer_id,
            'recipient_id': self.recipient_id,
            'is_expired': self.is_expired,
            'can_download': self.can_download,
            # Advanced security features
            'unlock_time': self.unlock_time.isoformat() if self.unlock_time else None,
            'is_one_time': self.is_one_time,
            'device_fingerprint': self.device_fingerprint,
            'allowed_countries': self.allowed_countries,
            'allowed_cities': self.allowed_cities,
            'center_lat': self.center_lat,
            'center_lng': self.center_lng,
            'max_distance_km': self.max_distance_km,
            'is_time_locked': self.is_time_locked,
            'time_until_unlock': self.time_until_unlock
        }

        if include_sensitive:
            data['password_hash'] = self.password_hash

        return data

    def __repr__(self):
        return f'<Share {self.share_link} (file:{self.file_id})>'