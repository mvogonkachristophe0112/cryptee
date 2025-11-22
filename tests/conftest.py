"""
Pytest configuration and fixtures for Cryptee tests.
"""

import pytest
import os
import tempfile
from flask import Flask
from backend.app import create_app, db
from backend.app.models import User
import json


@pytest.fixture
def app():
    """Create and configure a test app instance."""
    # Create temporary database
    db_fd, db_path = tempfile.mkstemp()

    app = create_app('conftest.TestingConfig')

    # Override database URI for testing
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False

    with app.app_context():
        db.create_all()

    yield app

    # Cleanup
    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """A test runner for the app's Click commands."""
    return app.test_cli_runner()


@pytest.fixture
def auth_headers(app):
    """Headers with valid JWT token for authenticated requests."""
    with app.app_context():
        # Create test user
        user = User(email='test@example.com', password='TestPassword123')
        db.session.add(user)
        db.session.commit()

        # Generate token
        access_token = user.generate_tokens()[0]

        return {'Authorization': f'Bearer {access_token}'}


@pytest.fixture
def refresh_headers(app):
    """Headers with valid refresh JWT token."""
    with app.app_context():
        # Create test user
        user = User(email='test@example.com', password='TestPassword123')
        db.session.add(user)
        db.session.commit()

        # Generate refresh token
        refresh_token = user.generate_tokens()[1]

        return {'Authorization': f'Bearer {refresh_token}'}


@pytest.fixture
def test_user(app):
    """Create and return a test user."""
    with app.app_context():
        user = User(email='test@example.com', password='TestPassword123')
        db.session.add(user)
        db.session.commit()
        return user


@pytest.fixture
def authenticated_client(client, auth_headers):
    """A test client with authentication headers."""
    client.auth_headers = auth_headers
    return client


# Custom test markers
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "unit: marks tests as unit tests"
    )


# Test configuration class for testing
class TestingConfig:
    """Testing configuration."""

    TESTING = True
    DEBUG = False
    SECRET_KEY = 'test-secret-key'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = 'test-jwt-secret'
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS = 30
    UPLOAD_FOLDER = '/tmp/test_uploads'
    MAX_CONTENT_LENGTH = 104857600  # 100MB
    ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'zip', 'rar'}
    BCRYPT_ROUNDS = 4  # Lower for faster tests
    ENCRYPTION_KEY_ITERATIONS = 1000  # Lower for faster tests
    RATELIMIT_DEFAULT = "1000 per minute"
    APP_NAME = 'Cryptee Test'
    APP_URL = 'http://localhost:5000'
    ADMIN_EMAIL = 'admin@test.com'