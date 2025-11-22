"""
Development configuration for Cryptee application.
"""

import os
from datetime import timedelta

class DevelopmentConfig:
    """Development environment configuration."""

    # Flask configuration
    DEBUG = True
    TESTING = False
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

    # Database configuration
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///cryptee_dev.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False  # Disable SQL echo for performance with concurrent users

    # Database connection pooling for concurrent users
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 20,          # Maximum number of persistent connections
        'max_overflow': 30,       # Maximum number of connections that can be created beyond pool_size
        'pool_pre_ping': True,    # Verify connections before use
        'pool_recycle': 3600,     # Recycle connections after 1 hour
        'connect_args': {
            'check_same_thread': False,  # Allow SQLite to be used in multiple threads
            'timeout': 30.0             # Connection timeout
        } if 'sqlite' in SQLALCHEMY_DATABASE_URI else {}
    }

    # JWT configuration
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'dev-jwt-secret-key')
    print(f"DEBUG: JWT_SECRET_KEY = {JWT_SECRET_KEY}")
    JWT_ALGORITHM = 'HS256'
    JWT_TOKEN_LOCATION = ['headers']
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRE_MINUTES', 15))
    JWT_REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv('JWT_REFRESH_TOKEN_EXPIRE_DAYS', 30))
    # Disable subject validation for PyJWT compatibility
    import jwt
    original_validate_sub = jwt.api_jwt.PyJWT._validate_sub
    jwt.api_jwt.PyJWT._validate_sub = lambda self, payload, subject: None

    # File upload configuration
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'uploads')
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_FILE_SIZE', 104857600))  # 100MB
    ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'zip', 'rar'}

    # Security configuration
    BCRYPT_ROUNDS = int(os.getenv('BCRYPT_ROUNDS', 12))
    ENCRYPTION_KEY_ITERATIONS = int(os.getenv('ENCRYPTION_KEY_ITERATIONS', 100000))

    # Redis configuration (optional for development)
    REDIS_URL = os.getenv('REDIS_URL')

    # Email configuration
    SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
    SMTP_USERNAME = os.getenv('SMTP_USERNAME')
    SMTP_PASSWORD = os.getenv('SMTP_PASSWORD')

    # Application configuration
    APP_NAME = os.getenv('APP_NAME', 'Cryptee Dev')
    APP_URL = os.getenv('APP_URL', 'http://localhost:5000')
    ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', 'admin@cryptee.dev')

    # Logging configuration
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'DEBUG')
    LOG_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'logs', 'cryptee_dev.log')

    # CORS configuration
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5000').split(',')

    # Rate limiting optimized for concurrent users
    RATELIMIT_DEFAULT = "200 per minute"  # Increased for 50+ users
    RATELIMIT_STORAGE_URL = REDIS_URL if REDIS_URL else None  # Fallback to in-memory

    # Specific rate limits for different endpoints
    RATELIMIT_STRATEGY = "fixed-window"
    RATELIMIT_HEADERS_ENABLED = True

    # Session configuration
    SESSION_TYPE = 'filesystem'
    SESSION_PERMANENT = False
    PERMANENT_SESSION_LIFETIME = timedelta(minutes=30)