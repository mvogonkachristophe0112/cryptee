"""
File management routes for Cryptee application.
Handles file upload, download, listing, and deletion.
"""

import os
import hashlib
import secrets
from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from .. import db, limiter
from ..models import User, File, FileVersion
from ..utils.logger import RequestLogger, log_error
from ..utils.validators import validate_file_size, sanitize_filename
from ..utils.audit import log_activity
from ..utils.crypto import calculate_checksum

files_bp = Blueprint('files', __name__)


def allowed_file(filename):
    """Check if file extension is allowed."""
    allowed_extensions = current_app.config.get('ALLOWED_EXTENSIONS', set())
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions


def calculate_checksum(file_path):
    """Calculate SHA-256 checksum of file."""
    hash_sha256 = hashlib.sha256()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_sha256.update(chunk)
    return hash_sha256.hexdigest()


@files_bp.route('', methods=['GET'])
@jwt_required()
@limiter.limit("100 per minute")
def list_files():
    """List user's files with pagination and filtering."""
    try:
        user_id = get_jwt_identity()

        # Query parameters
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 100)
        search = request.args.get('search', '').strip()
        sort_by = request.args.get('sort_by', 'upload_date')
        sort_order = request.args.get('sort_order', 'desc')

        # Build query
        query = File.query.filter_by(user_id=user_id, is_deleted=False)

        # Apply search filter
        if search:
            query = query.filter(File.original_filename.ilike(f'%{search}%'))

        # Apply sorting
        if sort_by == 'filename':
            order_column = File.original_filename
        elif sort_by == 'size':
            order_column = File.file_size
        elif sort_by == 'upload_date':
            order_column = File.upload_date
        else:
            order_column = File.upload_date

        if sort_order == 'asc':
            query = query.order_by(order_column.asc())
        else:
            query = query.order_by(order_column.desc())

        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        files = pagination.items

        return jsonify({
            'files': [file.to_dict() for file in files],
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
        return jsonify({'error': 'Failed to list files', 'details': str(e)}), 500


@files_bp.route('/upload', methods=['POST'])
@jwt_required()
@limiter.limit("20 per minute")
def upload_file():
    """Upload a file with optional encryption metadata."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Check if file is in request
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400

        # Get encryption metadata from form data
        encryption_iv = request.form.get('encryption_iv')
        encryption_salt = request.form.get('encryption_salt')
        recipient_email = request.form.get('recipient_email')
        share_password = request.form.get('share_password')
        message = request.form.get('message')
        encryption_key = request.form.get('encryption_key')

        # Secure filename and generate storage path
        original_filename = file.filename
        secure_name = secure_filename(original_filename)
        random_prefix = secrets.token_hex(8)
        storage_filename = f"{random_prefix}_{secure_name}"

        upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
        os.makedirs(upload_folder, exist_ok=True)
        storage_path = os.path.join(upload_folder, storage_filename)

        # Save file
        file.save(storage_path)

        # Calculate file size and checksum
        file_size = os.path.getsize(storage_path)
        checksum = calculate_checksum(storage_path)

        # Create file record
        file_record = File(
            user_id=user_id,
            filename=storage_filename,
            original_filename=original_filename,
            file_size=file_size,
            mime_type=file.mimetype,
            checksum=checksum,
            storage_path=storage_path,
            encryption_iv=encryption_iv,
            encryption_salt=encryption_salt
        )

        db.session.add(file_record)
        db.session.commit()

        response_data = {
            'message': 'File uploaded successfully',
            'file': file_record.to_dict()
        }

        # Create share if recipient email provided
        if recipient_email:
            from datetime import timedelta
            expires_at = datetime.utcnow() + timedelta(days=7)  # Default 7 days

            # Find recipient user if email matches
            recipient = User.query.filter_by(email=recipient_email.lower().strip()).first()
            recipient_id = recipient.id if recipient else None

            share = Share(
                file_id=file_record.id,
                sharer_id=user_id,
                expires_at=expires_at,
                password=share_password,
                recipient_id=recipient_id
            )

            db.session.add(share)
            db.session.commit()

            response_data['message'] = 'File uploaded and shared successfully'
            response_data['share'] = share.to_dict()

        return jsonify(response_data), 201

    except Exception as e:
        db.session.rollback()
        # Clean up uploaded file if it exists
        if 'storage_path' in locals() and os.path.exists(storage_path):
            os.remove(storage_path)
        return jsonify({'error': 'File upload failed', 'details': str(e)}), 500


@files_bp.route('/<int:file_id>', methods=['GET'])
@jwt_required()
@limiter.limit("50 per minute")
def get_file(file_id):
    """Get file information."""
    try:
        user_id = get_jwt_identity()

        file = File.query.filter_by(id=file_id, user_id=user_id, is_deleted=False).first()

        if not file:
            return jsonify({'error': 'File not found'}), 404

        return jsonify({'file': file.to_dict()}), 200

    except Exception as e:
        return jsonify({'error': 'Failed to get file', 'details': str(e)}), 500


@files_bp.route('/<int:file_id>/download', methods=['GET'])
@jwt_required()
@limiter.limit("30 per minute")
def download_file(file_id):
    """Download a file."""
    try:
        user_id = get_jwt_identity()

        file = File.query.filter_by(id=file_id, user_id=user_id, is_deleted=False).first()

        if not file:
            return jsonify({'error': 'File not found'}), 404

        if not file.file_exists:
            return jsonify({'error': 'File not found on disk'}), 404

        # Update last accessed timestamp
        file.mark_accessed()
        db.session.commit()

        # Send file with original filename
        return send_file(
            file.storage_path,
            as_attachment=True,
            download_name=file.original_filename,
            mimetype=file.mime_type
        )

    except Exception as e:
        return jsonify({'error': 'File download failed', 'details': str(e)}), 500


@files_bp.route('/<int:file_id>', methods=['DELETE'])
@jwt_required()
@limiter.limit("20 per minute")
def delete_file(file_id):
    """Soft delete a file."""
    try:
        user_id = get_jwt_identity()

        file = File.query.filter_by(id=file_id, user_id=user_id, is_deleted=False).first()

        if not file:
            return jsonify({'error': 'File not found'}), 404

        # Soft delete
        file.soft_delete()
        db.session.commit()

        return jsonify({'message': 'File deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'File deletion failed', 'details': str(e)}), 500


@files_bp.route('/<int:file_id>/restore', methods=['POST'])
@jwt_required()
@limiter.limit("10 per minute")
def restore_file(file_id):
    """Restore a soft-deleted file."""
    try:
        user_id = get_jwt_identity()

        file = File.query.filter_by(id=file_id, user_id=user_id, is_deleted=True).first()

        if not file:
            return jsonify({'error': 'File not found'}), 404

        file.restore()
        db.session.commit()

        return jsonify({
            'message': 'File restored successfully',
            'file': file.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'File restoration failed', 'details': str(e)}), 500


@files_bp.route('/<int:file_id>/permanent-delete', methods=['DELETE'])
@jwt_required()
@limiter.limit("5 per minute")
def permanent_delete_file_v2(file_id):
    """Permanently delete a file and remove from storage."""
    with RequestLogger(current_app.logger, get_jwt_identity()) as logger:
        try:
            user_id = get_jwt_identity()

            file = File.query.filter_by(id=file_id, user_id=user_id).first()

            if not file:
                return jsonify({'error': 'File not found'}), 404

            # Store filename for logging before deletion
            filename = file.original_filename

            # Remove all version files if they exist
            for version in file.versions:
                if version.file_exists:
                    try:
                        os.remove(version.storage_path)
                    except OSError as e:
                        current_app.logger.warning(f"Failed to delete version file {version.storage_path}: {e}")

            # Remove main file if it exists
            if file.file_exists:
                try:
                    os.remove(file.storage_path)
                except OSError as e:
                    current_app.logger.warning(f"Failed to delete main file {file.storage_path}: {e}")

            # Delete database record (cascade will handle versions)
            db.session.delete(file)
            db.session.commit()

            # Log permanent deletion
            log_activity(
                user_id=user_id,
                action='permanent_delete',
                resource_type='file',
                resource_id=file_id,
                details={'filename': filename, 'versions_deleted': len(file.versions)},
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent'),
                request_method=request.method,
                request_path=request.path
            )

            return jsonify({'message': 'File and all versions permanently deleted'}), 200

        except Exception as e:
            db.session.rollback()
            log_error(current_app.logger, e)
            return jsonify({'error': 'Permanent deletion failed'}), 500


@files_bp.route('/received', methods=['GET'])
@jwt_required()
@limiter.limit("50 per minute")
def get_received_files():
    """Get files received by the user."""
    try:
        user_id = get_jwt_identity()

        # Get shares where user is recipient
        shares = Share.query.filter_by(recipient_id=user_id, is_active=True).all()

        received_files = []
        for share in shares:
            try:
                sender_email = share.creator.email if share.creator else 'unknown'
                received_files.append({
                    'id': share.file.id,
                    'filename': share.file.original_filename,
                    'size': share.file.file_size,
                    'sender_email': sender_email,
                    'received_at': share.created_at.isoformat() if share.created_at else None,
                    'share_id': share.id
                })
            except Exception as e:
                current_app.logger.warning(f"Error processing share {share.id}: {e}")
                continue

        return jsonify(received_files), 200

    except Exception as e:
        current_app.logger.error(f"Error in get_received_files: {e}")
        return jsonify({'error': 'Failed to get received files', 'details': str(e)}), 500


@files_bp.route('/history', methods=['GET'])
@jwt_required()
@limiter.limit("50 per minute")
def get_file_history():
    """Get file history (sent and received)."""
    try:
        user_id = get_jwt_identity()

        history = []

        # Sent files
        user_files = File.query.filter_by(user_id=user_id).all()
        for file in user_files:
            for share in file.shares:
                history.append({
                    'id': file.id,
                    'filename': file.original_filename,
                    'size': file.file_size,
                    'type': 'sent',
                    'timestamp': share.created_at.isoformat() if share.created_at else None,
                    'recipient_email': share.recipient.email if share.recipient else 'public'
                })

        # Received files
        shares = Share.query.filter_by(recipient_id=user_id).all()
        for share in shares:
            history.append({
                'id': share.file.id,
                'filename': share.file.original_filename,
                'size': share.file.file_size,
                'type': 'received',
                'timestamp': share.created_at.isoformat() if share.created_at else None,
                'sender_email': share.creator.email
            })

        # Sort by timestamp (newest first)
        history.sort(key=lambda x: x['timestamp'] or '', reverse=True)

        return jsonify(history), 200

    except Exception as e:
        return jsonify({'error': 'Failed to get file history', 'details': str(e)}), 500


@files_bp.route('/<int:file_id>/versions', methods=['GET'])
@jwt_required()
@limiter.limit("50 per minute")
def list_file_versions(file_id):
    """List all versions of a file."""
    with RequestLogger(current_app.logger, get_jwt_identity()) as logger:
        try:
            user_id = get_jwt_identity()

            # Verify file ownership
            file = File.query.filter_by(id=file_id, user_id=user_id, is_deleted=False).first()
            if not file:
                return jsonify({'error': 'File not found'}), 404

            # Get versions ordered by version number (latest first)
            versions = file.versions.order_by(FileVersion.version_number.desc()).all()

            # Include file info in response
            response_data = {
                'file': {
                    'id': file.id,
                    'filename': file.original_filename,
                    'current_version': max([v.version_number for v in versions]) if versions else 1,
                    'total_versions': len(versions)
                },
                'versions': [version.to_dict() for version in versions]
            }

            return jsonify(response_data), 200

        except Exception as e:
            log_error(current_app.logger, e)
            return jsonify({'error': 'Failed to list file versions'}), 500


@files_bp.route('/<int:file_id>/versions/<int:version_id>', methods=['GET'])
@jwt_required()
@limiter.limit("30 per minute")
def get_file_version(file_id, version_id):
    """Get specific version information."""
    with RequestLogger(current_app.logger, get_jwt_identity()) as logger:
        try:
            user_id = get_jwt_identity()

            # Verify file ownership and version exists
            file = File.query.filter_by(id=file_id, user_id=user_id, is_deleted=False).first()
            if not file:
                return jsonify({'error': 'File not found'}), 404

            version = FileVersion.query.filter_by(id=version_id, file_id=file_id).first()
            if not version:
                return jsonify({'error': 'Version not found'}), 404

            return jsonify({'version': version.to_dict()}), 200

        except Exception as e:
            log_error(current_app.logger, e)
            return jsonify({'error': 'Failed to get file version'}), 500


@files_bp.route('/<int:file_id>/versions/<int:version_id>/download', methods=['GET'])
@jwt_required()
@limiter.limit("20 per minute")
def download_file_version(file_id, version_id):
    """Download a specific version of a file."""
    with RequestLogger(current_app.logger, get_jwt_identity()) as logger:
        try:
            user_id = get_jwt_identity()

            # Verify file ownership and version exists
            file = File.query.filter_by(id=file_id, user_id=user_id, is_deleted=False).first()
            if not file:
                return jsonify({'error': 'File not found'}), 404

            version = FileVersion.query.filter_by(id=version_id, file_id=file_id).first()
            if not version:
                return jsonify({'error': 'Version not found'}), 404

            if not version.file_exists:
                return jsonify({'error': 'Version file not found on disk'}), 404

            # Log download activity
            log_activity(
                user_id=user_id,
                action='download_version',
                resource_type='file_version',
                resource_id=version.id,
                details={'file_id': file_id, 'version_number': version.version_number},
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent'),
                request_method=request.method,
                request_path=request.path
            )

            # Send file
            return send_file(
                version.storage_path,
                as_attachment=True,
                download_name=version.original_filename,
                mimetype=version.mime_type
            )

        except Exception as e:
            log_error(current_app.logger, e)
            return jsonify({'error': 'Version download failed'}), 500


@files_bp.route('/<int:file_id>/versions', methods=['POST'])
@jwt_required()
@limiter.limit("10 per minute")
def create_file_version(file_id):
    """Create a new version of an existing file."""
    with RequestLogger(current_app.logger, get_jwt_identity()) as logger:
        try:
            user_id = get_jwt_identity()
            user = User.query.get(user_id)

            if not user:
                return jsonify({'error': 'User not found'}), 404

            # Verify file ownership
            file = File.query.filter_by(id=file_id, user_id=user_id, is_deleted=False).first()
            if not file:
                return jsonify({'error': 'File not found'}), 404

            # Check if new file is provided
            if 'file' not in request.files:
                return jsonify({'error': 'No file provided'}), 400

            new_file = request.files['file']
            if new_file.filename == '':
                return jsonify({'error': 'No file selected'}), 400

            # Validate file size
            new_file.seek(0, os.SEEK_END)
            file_size = new_file.tell()
            new_file.seek(0)

            valid_size, size_error = validate_file_size(file_size)
            if not valid_size:
                return jsonify({'error': size_error}), 400

            # Get change description
            change_description = request.form.get('change_description', '').strip()
            if len(change_description) > 500:
                return jsonify({'error': 'Change description too long'}), 400

            # Generate new storage path
            sanitized_filename = sanitize_filename(new_file.filename)
            random_prefix = secrets.token_hex(8)
            storage_filename = f"{random_prefix}_{sanitized_filename}"

            upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
            os.makedirs(upload_folder, exist_ok=True)
            storage_path = os.path.join(upload_folder, storage_filename)

            # Save new file
            new_file.save(storage_path)

            # Calculate checksum
            checksum = calculate_checksum(storage_path)

            # Get next version number
            latest_version = file.versions.first()
            next_version = (latest_version.version_number + 1) if latest_version else 2

            # Create version record
            version = FileVersion(
                file_id=file_id,
                version_number=next_version,
                filename=storage_filename,
                original_filename=new_file.filename,
                file_size=file_size,
                mime_type=new_file.mimetype,
                storage_path=storage_path,
                checksum=checksum,
                created_by=user_id,
                change_description=change_description
            )

            db.session.add(version)
            db.session.commit()

            # Log version creation
            log_activity(
                user_id=user_id,
                action='create_version',
                resource_type='file_version',
                resource_id=version.id,
                details={
                    'file_id': file_id,
                    'version_number': next_version,
                    'change_description': change_description
                },
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent'),
                request_method=request.method,
                request_path=request.path
            )

            return jsonify({
                'message': 'File version created successfully',
                'version': version.to_dict()
            }), 201

        except Exception as e:
            db.session.rollback()
            # Clean up uploaded file if it exists
            if 'storage_path' in locals() and os.path.exists(storage_path):
                os.remove(storage_path)
            log_error(current_app.logger, e)
            return jsonify({'error': 'Version creation failed'}), 500


@files_bp.route('/<int:file_id>/versions/<int:version_id>', methods=['DELETE'])
@jwt_required()
@limiter.limit("5 per minute")
def delete_file_version(file_id, version_id):
    """Delete a specific version of a file."""
    with RequestLogger(current_app.logger, get_jwt_identity()) as logger:
        try:
            user_id = get_jwt_identity()

            # Verify file ownership
            file = File.query.filter_by(id=file_id, user_id=user_id, is_deleted=False).first()
            if not file:
                return jsonify({'error': 'File not found'}), 404

            # Find version
            version = FileVersion.query.filter_by(id=version_id, file_id=file_id).first()
            if not version:
                return jsonify({'error': 'Version not found'}), 404

            # Cannot delete version 1 (original)
            if version.version_number == 1:
                return jsonify({'error': 'Cannot delete original version'}), 400

            # Remove physical file if it exists
            if version.file_exists:
                os.remove(version.storage_path)

            # Delete version record
            db.session.delete(version)
            db.session.commit()

            # Log deletion
            log_activity(
                user_id=user_id,
                action='delete_version',
                resource_type='file_version',
                resource_id=version_id,
                details={'file_id': file_id, 'version_number': version.version_number},
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent'),
                request_method=request.method,
                request_path=request.path
            )

            return jsonify({'message': 'Version deleted successfully'}), 200

        except Exception as e:
            db.session.rollback()
            log_error(current_app.logger, e)
            return jsonify({'error': 'Version deletion failed'}), 500


@files_bp.route('/<int:file_id>/permanent-delete', methods=['DELETE'])
@jwt_required()
@limiter.limit("5 per minute")
def permanent_delete_file(file_id):
    """Permanently delete a file and remove from storage."""
    with RequestLogger(current_app.logger, get_jwt_identity()) as logger:
        try:
            user_id = get_jwt_identity()

            file = File.query.filter_by(id=file_id, user_id=user_id).first()

            if not file:
                return jsonify({'error': 'File not found'}), 404

            # Store filename for logging before deletion
            filename = file.original_filename

            # Remove all version files if they exist
            for version in file.versions:
                if version.file_exists:
                    try:
                        os.remove(version.storage_path)
                    except OSError as e:
                        current_app.logger.warning(f"Failed to delete version file {version.storage_path}: {e}")

            # Remove main file if it exists
            if file.file_exists:
                try:
                    os.remove(file.storage_path)
                except OSError as e:
                    current_app.logger.warning(f"Failed to delete main file {file.storage_path}: {e}")

            # Delete database record (cascade will handle versions)
            db.session.delete(file)
            db.session.commit()

            # Log permanent deletion
            log_activity(
                user_id=user_id,
                action='permanent_delete',
                resource_type='file',
                resource_id=file_id,
                details={'filename': filename, 'versions_deleted': len(file.versions)},
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent'),
                request_method=request.method,
                request_path=request.path
            )

            return jsonify({'message': 'File and all versions permanently deleted'}), 200

        except Exception as e:
            db.session.rollback()
            log_error(current_app.logger, e)
            return jsonify({'error': 'Permanent deletion failed'}), 500