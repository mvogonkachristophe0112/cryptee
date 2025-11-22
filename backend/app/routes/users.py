"""
User management routes for Cryptee application.
Handles user profile management and administrative functions.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from .. import db, limiter
from ..models import User

users_bp = Blueprint('users', __name__)


@users_bp.route('/profile', methods=['GET'])
@jwt_required()
@limiter.limit("50 per minute")
def get_profile():
    """Get current user's profile information."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        return jsonify({'user': user.to_dict(include_sensitive=True)}), 200

    except Exception as e:
        return jsonify({'error': 'Failed to get profile', 'details': str(e)}), 500


@users_bp.route('/profile', methods=['PUT'])
@jwt_required()
@limiter.limit("20 per minute")
def update_profile():
    """Update current user's profile information."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Update allowed fields
        allowed_fields = ['first_name', 'last_name', 'username']
        for field in allowed_fields:
            if field in data:
                value = data[field].strip() if data[field] else None
                if field == 'username' and value:
                    # Check if username is already taken by another user
                    existing_user = User.query.filter_by(username=value).first()
                    if existing_user and existing_user.id != user.id:
                        return jsonify({'error': 'Username already taken'}), 409
                setattr(user, field, value)

        db.session.commit()

        return jsonify({
            'message': 'Profile updated successfully',
            'user': user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Profile update failed', 'details': str(e)}), 500


@users_bp.route('/change-password', methods=['POST'])
@jwt_required()
@limiter.limit("10 per minute")
def change_password():
    """Change current user's password."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        current_password = data.get('current_password')
        new_password = data.get('new_password')

        if not current_password or not new_password:
            return jsonify({'error': 'Current password and new password are required'}), 400

        # Verify current password
        if not user.check_password(current_password):
            return jsonify({'error': 'Current password is incorrect'}), 401

        # Set new password
        user.set_password(new_password)
        db.session.commit()

        return jsonify({'message': 'Password changed successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Password change failed', 'details': str(e)}), 500


@users_bp.route('/storage-info', methods=['GET'])
@jwt_required()
@limiter.limit("30 per minute")
def get_storage_info():
    """Get user's storage usage information."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Calculate storage usage
        from app.models import File
        total_size = db.session.query(db.func.sum(File.file_size)).filter_by(
            user_id=user_id, is_deleted=False
        ).scalar() or 0

        file_count = File.query.filter_by(user_id=user_id, is_deleted=False).count()

        # Storage limits (could be configurable per user/role)
        storage_limit = 100 * 1024 * 1024  # 100MB default
        if user.role == 'admin':
            storage_limit = 1024 * 1024 * 1024  # 1GB for admins

        return jsonify({
            'storage': {
                'used_bytes': total_size,
                'used_mb': round(total_size / (1024 * 1024), 2),
                'limit_bytes': storage_limit,
                'limit_mb': round(storage_limit / (1024 * 1024), 2),
                'percentage_used': round((total_size / storage_limit) * 100, 2) if storage_limit > 0 else 0,
                'file_count': file_count
            }
        }), 200

    except Exception as e:
        return jsonify({'error': 'Failed to get storage info', 'details': str(e)}), 500


@users_bp.route('/activity', methods=['GET'])
@jwt_required()
@limiter.limit("20 per minute")
def get_activity():
    """Get user's recent activity."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Query parameters
        limit = min(int(request.args.get('limit', 20)), 100)

        # Get recent files
        recent_files = user.files.filter_by(is_deleted=False).order_by(
            user.files.upload_date.desc()
        ).limit(limit).all()

        # Get recent shares created
        recent_shares = user.shares_created.order_by(
            user.shares_created.created_at.desc()
        ).limit(limit).all()

        # Combine and sort activities
        activities = []

        for file in recent_files:
            activities.append({
                'type': 'file_upload',
                'id': file.id,
                'description': f'Uploaded {file.original_filename}',
                'timestamp': file.upload_date.isoformat() if file.upload_date else None,
                'metadata': {
                    'file_size': file.size_mb,
                    'mime_type': file.mime_type
                }
            })

        for share in recent_shares:
            activities.append({
                'type': 'share_created',
                'id': share.id,
                'description': f'Shared {share.file.original_filename}',
                'timestamp': share.created_at.isoformat() if share.created_at else None,
                'metadata': {
                    'share_link': share.share_link[:16] + '...',
                    'expires_at': share.expires_at.isoformat() if share.expires_at else None
                }
            })

        # Sort by timestamp descending
        activities.sort(key=lambda x: x['timestamp'] or '', reverse=True)
        activities = activities[:limit]

        return jsonify({'activities': activities}), 200

    except Exception as e:
        return jsonify({'error': 'Failed to get activity', 'details': str(e)}), 500


# Admin-only routes
@users_bp.route('', methods=['GET'])
@jwt_required()
@limiter.limit("50 per minute")
def list_users():
    """List all users (admin only)."""
    try:
        user_id = get_jwt_identity()
        current_user = User.query.get(user_id)

        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403

        # Query parameters
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 100)
        search = request.args.get('search', '').strip()
        role_filter = request.args.get('role')

        # Build query
        query = User.query

        # Apply search filter
        if search:
            query = query.filter(
                db.or_(
                    User.email.ilike(f'%{search}%'),
                    User.first_name.ilike(f'%{search}%'),
                    User.last_name.ilike(f'%{search}%')
                )
            )

        # Apply role filter
        if role_filter:
            query = query.filter_by(role=role_filter)

        # Order by creation date
        query = query.order_by(User.created_at.desc())

        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        users = pagination.items

        return jsonify({
            'users': [user.to_dict(include_sensitive=True) for user in users],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200

    except Exception as e:
        return jsonify({'error': 'Failed to list users', 'details': str(e)}), 500


@users_bp.route('/<int:user_id>/status', methods=['PUT'])
@jwt_required()
@limiter.limit("10 per minute")
def update_user_status(user_id):
    """Update user status (admin only)."""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403

        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Update status fields
        if 'is_active' in data:
            user.is_active = bool(data['is_active'])

        if 'role' in data and data['role'] in ['user', 'admin']:
            user.role = data['role']

        db.session.commit()

        return jsonify({
            'message': 'User status updated successfully',
            'user': user.to_dict(include_sensitive=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update user status', 'details': str(e)}), 500


@users_bp.route('/<int:user_id>', methods=['DELETE'])
@jwt_required()
@limiter.limit("5 per minute")
def delete_user(user_id):
    """Delete a user account (admin only)."""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403

        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Prevent self-deletion
        if user.id == current_user.id:
            return jsonify({'error': 'Cannot delete your own account'}), 400

        # Delete user (cascade will handle related records)
        db.session.delete(user)
        db.session.commit()

        return jsonify({'message': 'User deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete user', 'details': str(e)}), 500


@users_bp.route('/profile/picture', methods=['POST'])
@jwt_required()
@limiter.limit("10 per minute")
def upload_profile_picture():
    """Upload profile picture for current user."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        if 'profile_picture' not in request.files:
            return jsonify({'error': 'No profile picture file provided'}), 400

        file = request.files['profile_picture']

        if not file or file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
        if not file.filename.lower().split('.')[-1] in allowed_extensions:
            return jsonify({'error': 'Invalid file type. Only PNG, JPG, JPEG, and GIF are allowed'}), 400

        # Validate file size (max 2MB)
        if len(file.read()) > 2 * 1024 * 1024:
            return jsonify({'error': 'File too large. Maximum size is 2MB'}), 400

        file.seek(0)  # Reset file pointer

        # Generate unique filename
        import os
        from werkzeug.utils import secure_filename

        filename = secure_filename(f"{user_id}_{file.filename}")
        filepath = os.path.join('uploads', 'profiles', filename)

        # Ensure directory exists
        os.makedirs(os.path.dirname(filepath), exist_ok=True)

        # Save file
        file.save(filepath)

        # Update user profile picture path
        user.profile_picture = filepath
        db.session.commit()

        return jsonify({
            'message': 'Profile picture uploaded successfully',
            'profile_picture': filepath,
            'user': user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Profile picture upload failed', 'details': str(e)}), 500


@users_bp.route('/profile/picture', methods=['DELETE'])
@jwt_required()
@limiter.limit("10 per minute")
def delete_profile_picture():
    """Delete current user's profile picture."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        if not user.profile_picture:
            return jsonify({'error': 'No profile picture to delete'}), 400

        # Delete file from filesystem
        import os
        if os.path.exists(user.profile_picture):
            os.remove(user.profile_picture)

        # Clear profile picture path
        user.profile_picture = None
        db.session.commit()

        return jsonify({
            'message': 'Profile picture deleted successfully',
            'user': user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Profile picture deletion failed', 'details': str(e)}), 500