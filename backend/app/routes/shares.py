"""
Sharing routes for Cryptee application.
Handles file sharing, link management, and access control.
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from .. import db, limiter
from ..models import User, File, Share

shares_bp = Blueprint('shares', __name__)


@shares_bp.route('', methods=['POST'])
@jwt_required()
@limiter.limit("20 per minute")
def create_share():
    """Create a share link for a file."""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        file_id = data.get('file_id')
        password = data.get('password')
        expires_in_days = data.get('expires_in_days', 7)
        max_downloads = data.get('max_downloads', -1)  # -1 = unlimited

        # Advanced security features
        unlock_time_str = data.get('unlock_time')  # ISO format datetime string
        is_one_time = data.get('is_one_time', False)
        device_fingerprint = data.get('device_fingerprint')
        allowed_countries = data.get('allowed_countries', [])
        allowed_cities = data.get('allowed_cities', [])
        center_lat = data.get('center_lat')
        center_lng = data.get('center_lng')
        max_distance_km = data.get('max_distance_km')

        if not file_id:
            return jsonify({'error': 'File ID is required'}), 400

        # Verify file ownership
        file = File.query.filter_by(id=file_id, user_id=user_id, is_deleted=False).first()

        if not file:
            return jsonify({'error': 'File not found or access denied'}), 404

        # Calculate expiration date
        expires_at = datetime.utcnow() + timedelta(days=expires_in_days)

        # Parse unlock time if provided
        unlock_time = None
        if unlock_time_str:
            try:
                unlock_time = datetime.fromisoformat(unlock_time_str.replace('Z', '+00:00'))
            except ValueError:
                return jsonify({'error': 'Invalid unlock_time format. Use ISO format.'}), 400

        # Create share
        share = Share(
            file_id=file_id,
            sharer_id=user_id,
            expires_at=expires_at,
            max_downloads=max_downloads,
            password=password,
            unlock_time=unlock_time,
            is_one_time=is_one_time,
            device_fingerprint=device_fingerprint,
            allowed_countries=allowed_countries,
            allowed_cities=allowed_cities,
            center_lat=center_lat,
            center_lng=center_lng,
            max_distance_km=max_distance_km
        )

        db.session.add(share)
        db.session.commit()

        return jsonify({
            'message': 'Share link created successfully',
            'share': share.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create share link', 'details': str(e)}), 500


@shares_bp.route('', methods=['GET'])
@jwt_required()
@limiter.limit("50 per minute")
def list_shares():
    """List user's created shares."""
    try:
        user_id = get_jwt_identity()

        # Query parameters
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 100)
        active_only = request.args.get('active_only', 'true').lower() == 'true'

        # Build query
        query = Share.query.filter_by(sharer_id=user_id)

        if active_only:
            query = query.filter_by(is_active=True).filter(
                Share.expires_at > datetime.utcnow()
            )

        # Order by creation date
        query = query.order_by(Share.created_at.desc())

        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        shares = pagination.items

        # Include file information
        shares_data = []
        for share in shares:
            share_dict = share.to_dict()
            share_dict['file'] = {
                'id': share.file.id,
                'filename': share.file.original_filename,
                'file_size': share.file.file_size,
                'size_mb': share.file.size_mb
            }
            shares_data.append(share_dict)

        return jsonify({
            'shares': shares_data,
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
        return jsonify({'error': 'Failed to list shares', 'details': str(e)}), 500


@shares_bp.route('/<share_link>', methods=['GET'])
@limiter.limit("100 per minute")
def access_share(share_link):
    """Access a shared file (public endpoint)."""
    try:
        # Find share by link
        share = Share.query.filter_by(share_link=share_link).first()

        if not share:
            return jsonify({'error': 'Share link not found'}), 404

        # Check if share is active and not expired
        if not share.is_active:
            return jsonify({'error': 'Share link has been revoked'}), 410

        if share.is_expired:
            return jsonify({'error': 'Share link has expired'}), 410

        if not share.can_download:
            return jsonify({'error': 'Download limit exceeded'}), 429

        # Check time lock
        if share.is_time_locked:
            return jsonify({
                'error': 'File is time-locked',
                'unlock_time': share.unlock_time.isoformat(),
                'time_until_unlock': share.time_until_unlock
            }), 423  # Locked

        # Check password if required
        password = request.args.get('password')
        if not share.check_password(password):
            return jsonify({'error': 'Invalid password'}), 401

        # Check geofence restrictions
        user_lat = request.args.get('lat', type=float)
        user_lng = request.args.get('lng', type=float)
        user_country = request.args.get('country')
        user_city = request.args.get('city')

        geofence_allowed, geofence_message = share.check_geofence(
            user_lat, user_lng, user_country, user_city
        )
        if not geofence_allowed:
            return jsonify({'error': geofence_message}), 403

        # Check device restrictions
        device_fingerprint = request.args.get('device_fingerprint')
        device_allowed, device_message = share.check_device_access(device_fingerprint)
        if not device_allowed:
            return jsonify({'error': device_message}), 403

        # Record access
        share.record_download()
        db.session.commit()

        # Return file information
        file_info = {
            'id': share.file.id,
            'filename': share.file.original_filename,
            'file_size': share.file.file_size,
            'size_mb': share.file.size_mb,
            'mime_type': share.file.mime_type,
            'checksum': share.file.checksum,
            'upload_date': share.file.upload_date.isoformat() if share.file.upload_date else None,
            'is_encrypted': share.file.is_encrypted,
            'encryption_iv': share.file.encryption_iv,
            'encryption_salt': share.file.encryption_salt,
            'share_info': {
                'expires_at': share.expires_at.isoformat() if share.expires_at else None,
                'downloads_remaining': share.downloads_remaining,
                'max_downloads': share.max_downloads
            }
        }

        return jsonify({'file': file_info}), 200

    except Exception as e:
        return jsonify({'error': 'Failed to access share', 'details': str(e)}), 500


@shares_bp.route('/<share_link>/download', methods=['GET'])
@limiter.limit("50 per minute")
def download_shared_file(share_link):
    """Download a shared file (public endpoint)."""
    try:
        from flask import send_file

        # Find share by link
        share = Share.query.filter_by(share_link=share_link).first()

        if not share:
            return jsonify({'error': 'Share link not found'}), 404

        # Check if share is active and not expired
        if not share.is_active:
            return jsonify({'error': 'Share link has been revoked'}), 410

        if share.is_expired:
            return jsonify({'error': 'Share link has expired'}), 410

        if not share.can_download:
            return jsonify({'error': 'Download limit exceeded'}), 429

        # Check time lock
        if share.is_time_locked:
            return jsonify({
                'error': 'File is time-locked',
                'unlock_time': share.unlock_time.isoformat(),
                'time_until_unlock': share.time_until_unlock
            }), 423  # Locked

        # Check password if required
        password = request.args.get('password')
        if not share.check_password(password):
            return jsonify({'error': 'Invalid password'}), 401

        # Check geofence restrictions
        user_lat = request.args.get('lat', type=float)
        user_lng = request.args.get('lng', type=float)
        user_country = request.args.get('country')
        user_city = request.args.get('city')

        geofence_allowed, geofence_message = share.check_geofence(
            user_lat, user_lng, user_country, user_city
        )
        if not geofence_allowed:
            return jsonify({'error': geofence_message}), 403

        # Check device restrictions
        device_fingerprint = request.args.get('device_fingerprint')
        device_allowed, device_message = share.check_device_access(device_fingerprint)
        if not device_allowed:
            return jsonify({'error': device_message}), 403

        # Check if file exists
        if not share.file.file_exists:
            return jsonify({'error': 'File not found on disk'}), 404

        # Record download
        share.record_download()
        db.session.commit()

        # Send file
        return send_file(
            share.file.storage_path,
            as_attachment=True,
            download_name=share.file.original_filename,
            mimetype=share.file.mime_type
        )

    except Exception as e:
        return jsonify({'error': 'File download failed', 'details': str(e)}), 500


@shares_bp.route('/<int:share_id>', methods=['DELETE'])
@jwt_required()
@limiter.limit("20 per minute")
def revoke_share(share_id):
    """Revoke a share link."""
    try:
        user_id = get_jwt_identity()

        share = Share.query.filter_by(id=share_id, sharer_id=user_id).first()

        if not share:
            return jsonify({'error': 'Share not found or access denied'}), 404

        share.revoke()
        db.session.commit()

        return jsonify({'message': 'Share link revoked successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to revoke share', 'details': str(e)}), 500


@shares_bp.route('/<int:share_id>/extend', methods=['POST'])
@jwt_required()
@limiter.limit("10 per minute")
def extend_share(share_id):
    """Extend the expiration date of a share."""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        days = data.get('days', 7) if data else 7

        share = Share.query.filter_by(id=share_id, sharer_id=user_id).first()

        if not share:
            return jsonify({'error': 'Share not found or access denied'}), 404

        share.extend_expiry(days)
        db.session.commit()

        return jsonify({
            'message': f'Share extended by {days} days',
            'share': share.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to extend share', 'details': str(e)}), 500


@shares_bp.route('/stats', methods=['GET'])
@jwt_required()
@limiter.limit("30 per minute")
def get_share_stats():
    """Get sharing statistics for the user."""
    try:
        user_id = get_jwt_identity()

        # Get share statistics
        total_shares = Share.query.filter_by(sharer_id=user_id).count()
        active_shares = Share.query.filter_by(sharer_id=user_id, is_active=True).filter(
            Share.expires_at > datetime.utcnow()
        ).count()
        total_downloads = db.session.query(db.func.sum(Share.download_count)).filter_by(
            sharer_id=user_id
        ).scalar() or 0

        # Recent shares
        recent_shares = Share.query.filter_by(sharer_id=user_id).order_by(
            Share.created_at.desc()
        ).limit(5).all()

        recent_shares_data = []
        for share in recent_shares:
            recent_shares_data.append({
                'id': share.id,
                'share_link': share.share_link,
                'file_name': share.file.original_filename,
                'created_at': share.created_at.isoformat() if share.created_at else None,
                'download_count': share.download_count,
                'is_active': share.is_active,
                'is_expired': share.is_expired
            })

        return jsonify({
            'stats': {
                'total_shares': total_shares,
                'active_shares': active_shares,
                'total_downloads': total_downloads
            },
            'recent_shares': recent_shares_data
        }), 200

    except Exception as e:
        return jsonify({'error': 'Failed to get share statistics', 'details': str(e)}), 500