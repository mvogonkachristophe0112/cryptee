"""
Tests for authentication routes.
"""

import pytest
import json
from flask import url_for
from backend.app.models import User
from backend.app import db


class TestAuthRoutes:
    """Test authentication endpoints."""

    def test_register_success(self, client, app):
        """Test successful user registration."""
        with app.app_context():
            data = {
                'email': 'test@example.com',
                'password': 'TestPassword123',
                'first_name': 'Test',
                'last_name': 'User'
            }

            response = client.post(
                url_for('auth.register'),
                data=json.dumps(data),
                content_type='application/json'
            )

            assert response.status_code == 201
            data = json.loads(response.data)
            assert 'user' in data
            assert 'access_token' in data
            assert 'refresh_token' in data
            assert data['user']['email'] == 'test@example.com'

    def test_register_duplicate_email(self, client, app):
        """Test registration with duplicate email."""
        with app.app_context():
            # Create first user
            user = User(email='test@example.com', password='password')
            db.session.add(user)
            db.session.commit()

            # Try to register with same email
            data = {
                'email': 'test@example.com',
                'password': 'TestPassword123'
            }

            response = client.post(
                url_for('auth.register'),
                data=json.dumps(data),
                content_type='application/json'
            )

            assert response.status_code == 409
            data = json.loads(response.data)
            assert 'error' in data

    def test_register_weak_password(self, client):
        """Test registration with weak password."""
        data = {
            'email': 'test@example.com',
            'password': 'weak'
        }

        response = client.post(
            url_for('auth.register'),
            data=json.dumps(data),
            content_type='application/json'
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data

    def test_login_success(self, client, app):
        """Test successful login."""
        with app.app_context():
            # Create user
            user = User(email='test@example.com', password='TestPassword123')
            db.session.add(user)
            db.session.commit()

            data = {
                'email': 'test@example.com',
                'password': 'TestPassword123'
            }

            response = client.post(
                url_for('auth.login'),
                data=json.dumps(data),
                content_type='application/json'
            )

            assert response.status_code == 200
            data = json.loads(response.data)
            assert 'user' in data
            assert 'access_token' in data
            assert 'refresh_token' in data

    def test_login_invalid_credentials(self, client):
        """Test login with invalid credentials."""
        data = {
            'email': 'nonexistent@example.com',
            'password': 'wrongpassword'
        }

        response = client.post(
            url_for('auth.login'),
            data=json.dumps(data),
            content_type='application/json'
        )

        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data

    def test_get_current_user(self, client, auth_headers):
        """Test getting current user info."""
        response = client.get(
            url_for('auth.get_current_user'),
            headers=auth_headers
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'user' in data
        assert 'email' in data['user']

    def test_get_current_user_unauthorized(self, client):
        """Test getting current user without authentication."""
        response = client.get(url_for('auth.get_current_user'))

        assert response.status_code == 401

    def test_refresh_token(self, client, refresh_headers):
        """Test token refresh."""
        response = client.post(
            url_for('auth.refresh_token'),
            headers=refresh_headers
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'access_token' in data
        assert 'user' in data

    def test_logout(self, client, auth_headers):
        """Test logout."""
        response = client.post(
            url_for('auth.logout'),
            headers=auth_headers
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'message' in data


class TestUserModel:
    """Test User model methods."""

    def test_password_hashing(self, app):
        """Test password hashing and verification."""
        with app.app_context():
            user = User(email='test@example.com')
            user.set_password('TestPassword123')

            assert user.check_password('TestPassword123')
            assert not user.check_password('WrongPassword')

    def test_password_validation(self, app):
        """Test password complexity requirements."""
        with app.app_context():
            user = User(email='test@example.com')

            # Valid password
            user.set_password('ValidPass123')

            # Invalid passwords
            with pytest.raises(ValueError):
                user.set_password('short')  # Too short

            with pytest.raises(ValueError):
                user.set_password('nouppercaseornumbers')  # Missing uppercase and numbers

            with pytest.raises(ValueError):
                user.set_password('NOLOWERCASE123')  # Missing lowercase

            with pytest.raises(ValueError):
                user.set_password('NoNumbers')  # Missing numbers

    def test_account_lockout(self, app):
        """Test account lockout after failed attempts."""
        with app.app_context():
            user = User(email='test@example.com')
            user.set_password('TestPassword123')

            # Simulate failed login attempts
            for i in range(5):
                user.increment_login_attempts()
                assert not user.check_password('WrongPassword')

            # Account should be locked
            assert user.is_locked()

            # Reset attempts
            user.reset_login_attempts()
            assert not user.is_locked()
            assert user.login_attempts == 0

    def test_user_to_dict(self, app):
        """Test user serialization."""
        with app.app_context():
            user = User(
                email='test@example.com',
                first_name='Test',
                last_name='User'
            )
            user.set_password('TestPassword123')

            data = user.to_dict()
            assert data['email'] == 'test@example.com'
            assert data['first_name'] == 'Test'
            assert data['last_name'] == 'User'
            assert 'password_hash' not in data

            # Test with sensitive data
            data_sensitive = user.to_dict(include_sensitive=True)
            assert 'login_attempts' in data_sensitive
            assert 'locked_until' in data_sensitive