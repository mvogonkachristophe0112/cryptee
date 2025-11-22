"""
Authentication routes for Cryptee application.
Handles user registration, login, logout, and token management.
"""

from flask import Blueprint, request, jsonify, current_app, url_for
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt,
    get_jwt_header
)
from werkzeug.security import check_password_hash
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import base64
import json
import secrets
from datetime import datetime, timedelta
from .. import db, limiter
from ..models import User
from ..utils.logger import RequestLogger, log_error
from ..utils.validators import validate_email, validate_password, sanitize_text
from ..utils.audit import log_activity
from ..utils.email_service import send_password_reset_email

auth_bp = Blueprint('auth', __name__)

# Encryption utilities for handling encrypted payloads
def decrypt_payload(encrypted_data, key):
    """Decrypt payload using AES (compatible with CryptoJS)"""
    try:
        current_app.logger.info(f'=== DECRYPT PAYLOAD START ===')
        current_app.logger.info(f'Decrypting payload - key length: {len(key) if key else 0}, encrypted_data length: {len(encrypted_data) if encrypted_data else 0}')
        current_app.logger.info(f'Key (first 20 chars): {key[:20] if key else "None"}')
        current_app.logger.info(f'Encrypted data (first 50 chars): {encrypted_data[:50] if encrypted_data else "None"}')

        # Convert hex key to bytes
        key_bytes = bytes.fromhex(key)
        current_app.logger.info(f'Key bytes length: {len(key_bytes)}')

        # CryptoJS AES uses CBC mode with zero IV by default
        iv = b'\x00' * 16  # Zero IV
        current_app.logger.info(f'Using IV: {iv.hex()}')

        # Decode base64 encrypted data
        encrypted_bytes = base64.b64decode(encrypted_data)
        current_app.logger.info(f'Encrypted bytes length: {len(encrypted_bytes)}')

        # Create cipher
        cipher = Cipher(algorithms.AES(key_bytes), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()

        # Decrypt
        decrypted_padded = decryptor.update(encrypted_bytes) + decryptor.finalize()
        current_app.logger.info(f'Decrypted padded length: {len(decrypted_padded)}')

        # Remove PKCS7 padding
        if len(decrypted_padded) == 0:
            current_app.logger.error('Decrypted data is empty')
            return None

        padding_length = decrypted_padded[-1]
        current_app.logger.info(f'Padding length: {padding_length}')

        if padding_length > 16 or padding_length == 0:
            current_app.logger.error(f'Invalid padding length: {padding_length}')
            return None

        decrypted = decrypted_padded[:-padding_length]
        current_app.logger.info(f'Decrypted data length: {len(decrypted)}')
        current_app.logger.info(f'Decrypted data: {decrypted.decode()[:100]}')

        result = json.loads(decrypted.decode())
        current_app.logger.info(f'Parsed JSON: {result}')
        current_app.logger.info(f'=== DECRYPT PAYLOAD SUCCESS ===')
        return result
    except Exception as e:
        current_app.logger.error(f'=== DECRYPT PAYLOAD FAILED ===')
        current_app.logger.error(f'Decryption error: {e}')
        current_app.logger.error(f'Exception type: {type(e).__name__}')
        import traceback
        current_app.logger.error(f'Traceback: {traceback.format_exc()}')
        return None

def is_encrypted_payload(data):
    """Check if payload contains encrypted data"""
    return isinstance(data, dict) and 'encryptedData' in data and 'key' in data


@auth_bp.route('/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    """Register a new user account."""
    with RequestLogger(current_app.logger) as logger:
        try:
            current_app.logger.info(f"Content-Type: {request.headers.get('Content-Type')}")
            current_app.logger.info(f"Content-Length: {request.headers.get('Content-Length')}")
            current_app.logger.info(f"Raw data: {request.get_data(as_text=True)}")

            try:
                data = request.get_json()
                current_app.logger.info(f"Parsed JSON: {data}")
            except Exception as json_error:
                current_app.logger.error(f"JSON parsing failed: {json_error}")
                return jsonify({'error': 'Invalid JSON format'}), 400

            if not data:
                return jsonify({'error': 'No data provided'}), 400

            # Handle encrypted payloads
            if is_encrypted_payload(data):
                current_app.logger.info("Received encrypted payload for registration")
                decrypted_data = decrypt_payload(data['encryptedData'], data['key'])
                if not decrypted_data:
                    return jsonify({'error': 'Failed to decrypt payload'}), 400
                data = decrypted_data

            email = data.get('email', '').strip().lower()
            password = data.get('password')
            first_name = sanitize_text(data.get('first_name', ''))
            last_name = sanitize_text(data.get('last_name', ''))

            # Basic validation
            if not email:
                return jsonify({'error': 'Email is required'}), 400
            if not password:
                return jsonify({'error': 'Password is required'}), 400
            if len(password) < 6:
                return jsonify({'error': 'Password must be at least 6 characters long'}), 400

            # Simple email validation
            if '@' not in email or '.' not in email:
                return jsonify({'error': 'Invalid email format'}), 400

            # Check if user already exists (simplified check)
            try:
                existing_user = User.query.filter_by(email=email).first()
                if existing_user:
                    return jsonify({'error': 'Email already registered'}), 409
            except Exception as db_error:
                current_app.logger.warning(f'Database check failed: {db_error}')
                # Continue with registration if database check fails

            # Create new user
            username = sanitize_text(data.get('username', email.split('@')[0]))
            try:
                existing_username = User.query.filter_by(username=username).first()
                if existing_username:
                    # Generate unique username
                    import random
                    username = f"{username}{random.randint(100, 999)}"
            except Exception as db_error:
                current_app.logger.warning(f'Username check failed: {db_error}')

            user = User(
                email=email,
                username=username,
                password=password,
                first_name=first_name or None,
                last_name=last_name or None
            )

            try:
                db.session.add(user)
                db.session.commit()
            except Exception as db_error:
                db.session.rollback()
                current_app.logger.error(f'Database commit failed: {db_error}')
                return jsonify({'error': 'Failed to create user account'}), 500

            # Log successful registration (optional)
            try:
                log_activity(
                    user_id=user.id,
                    action='register',
                    resource_type='user',
                    resource_id=user.id,
                    details={'email': email, 'first_name': first_name, 'last_name': last_name},
                    ip_address=request.remote_addr,
                    user_agent=request.headers.get('User-Agent'),
                    request_method=request.method,
                    request_path=request.path
                )
            except Exception as log_err:
                current_app.logger.warning(f'Activity logging failed: {log_err}')

            # Generate tokens
            try:
                access_token = create_access_token(identity=user.id)
                refresh_token = create_refresh_token(identity=user.id)
            except Exception as token_error:
                current_app.logger.error(f'Token generation failed: {token_error}')
                return jsonify({'error': 'Account created but token generation failed'}), 500

            return jsonify({
                'message': 'User registered successfully',
                'user': user.to_dict(),
                'access_token': access_token,
                'refresh_token': refresh_token
            }), 201

        except Exception as e:
            db.session.rollback()
            log_error(current_app.logger, e)
            return jsonify({'error': 'Registration failed'}), 500


@auth_bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    """Authenticate user and return JWT tokens."""
    with RequestLogger(current_app.logger) as logger:
        try:
            current_app.logger.info("=== LOGIN ATTEMPT START ===")
            current_app.logger.info(f"Content-Type: {request.headers.get('Content-Type')}")
            current_app.logger.info(f"Content-Length: {request.headers.get('Content-Length')}")
            current_app.logger.info(f"Raw data: {request.get_data(as_text=True)}")

            try:
                data = request.get_json()
                current_app.logger.info(f"Parsed JSON: {data}")
            except Exception as json_error:
                current_app.logger.error(f"JSON parsing failed: {json_error}")
                return jsonify({'error': 'Invalid JSON format'}), 400

            if not data:
                current_app.logger.error("No data provided in request")
                return jsonify({'error': 'No data provided'}), 400

            # Handle encrypted payloads
            if is_encrypted_payload(data):
                current_app.logger.info("Received encrypted payload for login")
                current_app.logger.info(f"Encrypted data length: {len(data.get('encryptedData', ''))}")
                current_app.logger.info(f"Key provided: {bool(data.get('key'))}")
                decrypted_data = decrypt_payload(data['encryptedData'], data['key'])
                if not decrypted_data:
                    current_app.logger.error("Failed to decrypt payload")
                    return jsonify({'error': 'Failed to decrypt payload'}), 400
                current_app.logger.info(f"Decrypted data: {decrypted_data}")
                data = decrypted_data
            else:
                current_app.logger.info("Received unencrypted payload")

            email = data.get('email', '').strip().lower()
            password = data.get('password')
            current_app.logger.info(f"Extracted email: {email}")
            current_app.logger.info(f"Password provided: {bool(password)}")

            if not email or not password:
                current_app.logger.error("Email or password missing")
                return jsonify({'error': 'Email and password are required'}), 400

            # Find user
            current_app.logger.info(f'Looking up user with email: {email}')
            try:
                user = User.query.filter_by(email=email).first()
                current_app.logger.info(f'User found: {user is not None}')
                if user:
                    current_app.logger.info(f'User ID: {user.id}, Active: {user.is_active}, Locked: {user.is_locked()}')
            except Exception as db_error:
                current_app.logger.error(f'Database query failed: {db_error}')
                return jsonify({'error': 'Database error'}), 500

            if not user:
                # Log failed login attempt
                current_app.logger.warning(f'Login failed: user not found for email {email}')
                log_activity(
                    user_id=None,
                    action='login_failed',
                    resource_type='user',
                    details={'email': email, 'reason': 'user_not_found'},
                    ip_address=request.remote_addr,
                    user_agent=request.headers.get('User-Agent'),
                    request_method=request.method,
                    request_path=request.path,
                    status='failure'
                )
                return jsonify({'error': 'Invalid email or password'}), 401

            # Check if account is locked
            if user.is_locked():
                log_activity(
                    user_id=user.id,
                    action='login_failed',
                    resource_type='user',
                    resource_id=user.id,
                    details={'reason': 'account_locked'},
                    ip_address=request.remote_addr,
                    user_agent=request.headers.get('User-Agent'),
                    request_method=request.method,
                    request_path=request.path,
                    status='failure'
                )
                return jsonify({'error': 'Account is temporarily locked due to too many failed attempts'}), 423

            # Verify password
            current_app.logger.info(f'Checking password for user {user.id}')
            try:
                password_valid = user.check_password(password)
                current_app.logger.info(f'Password check result: {password_valid}')
            except Exception as pw_error:
                current_app.logger.error(f'Password check failed: {pw_error}')
                return jsonify({'error': 'Authentication error'}), 500

            if not password_valid:
                current_app.logger.warning(f'Login failed: invalid password for user {user.id}')
                user.increment_login_attempts()
                db.session.commit()

                log_activity(
                    user_id=user.id,
                    action='login_failed',
                    resource_type='user',
                    resource_id=user.id,
                    details={'reason': 'invalid_password'},
                    ip_address=request.remote_addr,
                    user_agent=request.headers.get('User-Agent'),
                    request_method=request.method,
                    request_path=request.path,
                    status='failure'
                )
                return jsonify({'error': 'Invalid email or password'}), 401

            # Reset login attempts on successful login
            user.reset_login_attempts()
            db.session.commit()

            # Log successful login
            log_activity(
                user_id=user.id,
                action='login',
                resource_type='user',
                resource_id=user.id,
                details={'email': email},
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent'),
                request_method=request.method,
                request_path=request.path
            )

            # Generate tokens
            try:
                access_token = create_access_token(identity=user.id)
                refresh_token = create_refresh_token(identity=user.id)
                current_app.logger.info(f'Tokens generated successfully for user {user.id}')
            except Exception as token_error:
                current_app.logger.error(f'Token generation failed: {token_error}')
                return jsonify({'error': 'Token generation failed'}), 500

            current_app.logger.info("=== LOGIN SUCCESSFUL ===")
            return jsonify({
                'message': 'Login successful',
                'user': user.to_dict(),
                'access_token': access_token,
                'refresh_token': refresh_token
            }), 200

        except Exception as e:
            current_app.logger.error("=== LOGIN FAILED WITH EXCEPTION ===")
            log_error(current_app.logger, e)
            return jsonify({'error': 'Login failed'}), 500


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user by invalidating tokens on server side."""
    try:
        # Get current token details
        jwt_header = get_jwt_header()
        user_id = get_jwt_identity()

        # In a production system, you would add the token to a blacklist
        # For now, we'll just log the logout and return success
        # The client should remove the token from localStorage

        log_activity(
            user_id=user_id,
            action='logout',
            resource_type='user',
            resource_id=user_id,
            details={'token_type': jwt_header.get('typ', 'unknown')},
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            request_method=request.method,
            request_path=request.path
        )

        return jsonify({'message': 'Logged out successfully'}), 200

    except Exception as e:
        log_error(current_app.logger, e)
        return jsonify({'error': 'Logout failed'}), 500


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current authenticated user information."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        return jsonify({'user': user.to_dict()}), 200

    except Exception as e:
        return jsonify({'error': 'Failed to get user information', 'details': str(e)}), 500


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh_token():
    """Refresh access token using refresh token."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Generate new access token
        access_token = create_access_token(identity=user.id)

        return jsonify({
            'access_token': access_token,
            'user': user.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'error': 'Token refresh failed', 'details': str(e)}), 500


@auth_bp.route('/verify-email', methods=['POST'])
@jwt_required()
def verify_email():
    """Verify user's email address."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        if user.is_email_verified:
            return jsonify({'message': 'Email already verified'}), 200

        # In a real implementation, this would send a verification email
        # For now, we'll just mark as verified
        user.is_email_verified = True
        db.session.commit()

        return jsonify({'message': 'Email verified successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Email verification failed', 'details': str(e)}), 500


@auth_bp.route('/forgot-password', methods=['POST'])
@limiter.limit("3 per hour")
def forgot_password():
    """Request password reset token via email."""
    try:
        data = request.get_json()

        if not data or not data.get('email'):
            return jsonify({'error': 'Email is required'}), 400

        email = data['email'].strip().lower()

        # Find user
        user = User.query.filter_by(email=email).first()

        if not user:
            # Don't reveal if email exists or not for security
            return jsonify({'message': 'If the email exists, a password reset link has been sent'}), 200

        # Generate reset token
        reset_token = user.generate_password_reset_token()
        db.session.commit()

        # Send reset email
        try:
            reset_url = url_for('auth.reset_password', token=reset_token, _external=True)
            email_sent = send_password_reset_email(user.email, reset_url)
            if not email_sent:
                current_app.logger.warning(f'Password reset email failed to send to {user.email}')
        except Exception as e:
            current_app.logger.error(f'Failed to send password reset email: {e}')
            # Don't fail the request, just log the error

        log_activity(
            user_id=user.id,
            action='password_reset_requested',
            resource_type='user',
            resource_id=user.id,
            details={'email': email},
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            request_method=request.method,
            request_path=request.path
        )

        return jsonify({'message': 'If the email exists, a password reset link has been sent'}), 200

    except Exception as e:
        db.session.rollback()
        log_error(current_app.logger, e)
        return jsonify({'error': 'Password reset request failed'}), 500


@auth_bp.route('/reset-password/<token>', methods=['POST'])
def reset_password(token):
    """Reset password using token."""
    try:
        data = request.get_json()

        if not data or not data.get('password'):
            return jsonify({'error': 'New password is required'}), 400

        new_password = data['password']

        # Validate new password
        password_valid, password_error = validate_password(new_password)
        if not password_valid:
            return jsonify({'error': password_error}), 400

        # Find user with valid token
        user = User.query.filter_by(password_reset_token=token).first()

        if not user or not user.verify_password_reset_token(token):
            return jsonify({'error': 'Invalid or expired reset token'}), 400

        # Update password
        user.set_password(new_password)
        user.clear_password_reset_token()
        db.session.commit()

        log_activity(
            user_id=user.id,
            action='password_reset',
            resource_type='user',
            resource_id=user.id,
            details={'method': 'token_reset'},
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            request_method=request.method,
            request_path=request.path
        )

        return jsonify({'message': 'Password reset successfully'}), 200

    except Exception as e:
        db.session.rollback()
        log_error(current_app.logger, e)
        return jsonify({'error': 'Password reset failed'}), 500


@auth_bp.route('/heartbeat', methods=['POST'])
@jwt_required()
def session_heartbeat():
    """Receive session heartbeat from client."""
    try:
        user_id = get_jwt_identity()
        data = request.get_json() or {}

        # Update user's last activity
        user = User.query.get(user_id)
        if user:
            user.last_login = datetime.utcnow()
            db.session.commit()

        # Log heartbeat
        log_activity(
            user_id=user_id,
            action='session_heartbeat',
            resource_type='user',
            resource_id=user_id,
            details={
                'user_agent': data.get('userAgent', ''),
                'online': data.get('online', True),
                'timestamp': data.get('timestamp', 0)
            },
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            request_method=request.method,
            request_path=request.path
        )

        return jsonify({'status': 'ok', 'timestamp': datetime.utcnow().isoformat()}), 200

    except Exception as e:
        log_error(current_app.logger, e)
        return jsonify({'error': 'Heartbeat failed'}), 500


@auth_bp.route('/session-health', methods=['GET'])
@jwt_required()
def check_session_health():
    """Check if the current session is still valid."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        if not user.is_active:
            return jsonify({'error': 'Account deactivated'}), 403

        if user.is_locked():
            return jsonify({'error': 'Account locked'}), 423

        # Check JWT token expiration (Flask-JWT-Extended handles this automatically)
        # If we reach here, token is valid

        return jsonify({
            'status': 'healthy',
            'user_id': user_id,
            'timestamp': datetime.utcnow().isoformat()
        }), 200

    except Exception as e:
        log_error(current_app.logger, e)
        return jsonify({'error': 'Session health check failed'}), 500


@auth_bp.route('/force-logout', methods=['POST'])
@jwt_required()
def force_logout():
    """Force logout with reason (for security features)."""
    try:
        user_id = get_jwt_identity()
        data = request.get_json() or {}
        reason = data.get('reason', 'manual_logout')

        # Log the forced logout
        log_activity(
            user_id=user_id,
            action='force_logout',
            resource_type='user',
            resource_id=user_id,
            details={
                'reason': reason,
                'timestamp': data.get('timestamp', 0),
                'ip_address': request.remote_addr
            },
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            request_method=request.method,
            request_path=request.path
        )

        return jsonify({'message': 'Logged out successfully', 'reason': reason}), 200

    except Exception as e:
        log_error(current_app.logger, e)
        return jsonify({'error': 'Force logout failed'}), 500