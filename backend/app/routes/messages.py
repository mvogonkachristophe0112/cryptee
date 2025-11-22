"""
Message routes for Cryptee secure messaging.
Handles sending, receiving, and managing secure messages with attachments.
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
import os
import hashlib
from datetime import datetime
from .. import db, limiter
from ..models import User, Message, MessageAttachment, Contact
from ..utils.logger import RequestLogger, log_error
from ..utils.validators import validate_email, sanitize_text
from ..utils.audit import log_activity

messages_bp = Blueprint('messages', __name__)

ALLOWED_EXTENSIONS = {
    'image': {'png', 'jpg', 'jpeg', 'gif', 'webp'},
    'video': {'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'},
    'audio': {'mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'},
    'document': {'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx'},
    'contact': set()  # Special handling for contacts
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


def allowed_file(filename, file_type):
    """Check if file extension is allowed for the given type."""
    if file_type not in ALLOWED_EXTENSIONS:
        return False
    if file_type == 'contact':
        return True  # Contacts don't have file extensions
    ext = filename.lower().split('.')[-1]
    return ext in ALLOWED_EXTENSIONS[file_type]


def get_file_type(filename):
    """Determine file type based on extension."""
    ext = filename.lower().split('.')[-1]

    for file_type, extensions in ALLOWED_EXTENSIONS.items():
        if file_type != 'contact' and ext in extensions:
            return file_type

    return 'document'  # Default to document


@messages_bp.route('', methods=['GET'])
@jwt_required()
@limiter.limit("50 per minute")
def get_messages():
    """Get user's messages (sent and received)."""
    try:
        user_id = get_jwt_identity()

        # Query parameters
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 100)
        message_type = request.args.get('type')  # sent, received, all
        search = request.args.get('search', '').strip()
        is_read = request.args.get('is_read')  # true, false, or None

        # Build query based on type
        if message_type == 'sent':
            query = Message.query.filter_by(sender_id=user_id, is_deleted=False)
        elif message_type == 'received':
            query = Message.query.filter_by(recipient_id=user_id, is_deleted=False)
        else:  # all
            query = Message.query.filter(
                ((Message.sender_id == user_id) | (Message.recipient_id == user_id)) &
                (Message.is_deleted == False)
            )

        # Apply search filter
        if search:
            query = query.filter(
                db.or_(
                    Message.subject.ilike(f'%{search}%'),
                    Message.content.ilike(f'%{search}%')
                )
            )

        # Apply read status filter
        if is_read is not None:
            read_status = is_read.lower() == 'true'
            query = query.filter_by(is_read=read_status)

        # Order by creation date (newest first)
        query = query.order_by(Message.created_at.desc())

        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        messages = pagination.items

        return jsonify({
            'messages': [message.to_dict(
                include_sender=True,
                include_recipient=True
            ) for message in messages],
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
        log_error(current_app.logger, e)
        return jsonify({'error': 'Failed to get messages'}), 500


@messages_bp.route('', methods=['POST'])
@jwt_required()
@limiter.limit("20 per minute")
def send_message():
    """Send a new message."""
    try:
        user_id = get_jwt_identity()
        sender = User.query.get(user_id)

        if not sender:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        recipient_email = data.get('recipient_email', '').strip().lower()
        subject = sanitize_text(data.get('subject', ''))
        content = sanitize_text(data.get('content', ''))
        message_type = data.get('message_type', 'text')

        # Validate required fields
        if not recipient_email:
            return jsonify({'error': 'Recipient email is required'}), 400

        if not subject:
            return jsonify({'error': 'Subject is required'}), 400

        if not content:
            return jsonify({'error': 'Message content is required'}), 400

        # Find recipient
        recipient = User.query.filter_by(email=recipient_email).first()
        if not recipient:
            return jsonify({'error': 'Recipient not found'}), 404

        # Don't allow sending to self
        if recipient.id == user_id:
            return jsonify({'error': 'Cannot send message to yourself'}), 400

        # Create message
        message = Message(
            sender_id=user_id,
            recipient_id=recipient.id,
            subject=subject,
            content=content,
            message_type=message_type
        )

        db.session.add(message)
        db.session.commit()

        # Log activity
        log_activity(
            user_id=user_id,
            action='message_sent',
            resource_type='message',
            resource_id=message.id,
            details={'recipient_email': recipient_email, 'subject': subject},
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            request_method=request.method,
            request_path=request.path
        )

        return jsonify({
            'message': 'Message sent successfully',
            'message_data': message.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        log_error(current_app.logger, e)
        return jsonify({'error': 'Failed to send message'}), 500


@messages_bp.route('/<int:message_id>', methods=['GET'])
@jwt_required()
@limiter.limit("100 per minute")
def get_message(message_id):
    """Get a specific message."""
    try:
        user_id = get_jwt_identity()

        message = Message.query.get(message_id)

        if not message:
            return jsonify({'error': 'Message not found'}), 404

        # Check if user has permission to view this message
        if message.sender_id != user_id and message.recipient_id != user_id:
            return jsonify({'error': 'Access denied'}), 403

        # Mark as read if recipient is viewing
        if message.recipient_id == user_id and not message.is_read:
            message.mark_as_read()
            db.session.commit()

        return jsonify({'message': message.to_dict()}), 200

    except Exception as e:
        log_error(current_app.logger, e)
        return jsonify({'error': 'Failed to get message'}), 500


@messages_bp.route('/<int:message_id>', methods=['DELETE'])
@jwt_required()
@limiter.limit("20 per minute")
def delete_message(message_id):
    """Delete a message (soft delete)."""
    try:
        user_id = get_jwt_identity()

        message = Message.query.get(message_id)

        if not message:
            return jsonify({'error': 'Message not found'}), 404

        # Check if user has permission to delete this message
        if message.sender_id != user_id and message.recipient_id != user_id:
            return jsonify({'error': 'Access denied'}), 403

        message.mark_as_deleted()
        db.session.commit()

        log_activity(
            user_id=user_id,
            action='message_deleted',
            resource_type='message',
            resource_id=message.id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            request_method=request.method,
            request_path=request.path
        )

        return jsonify({'message': 'Message deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        log_error(current_app.logger, e)
        return jsonify({'error': 'Failed to delete message'}), 500


@messages_bp.route('/<int:message_id>/read', methods=['PUT'])
@jwt_required()
@limiter.limit("50 per minute")
def mark_message_read(message_id):
    """Mark a message as read."""
    try:
        user_id = get_jwt_identity()

        message = Message.query.get(message_id)

        if not message:
            return jsonify({'error': 'Message not found'}), 404

        # Only recipient can mark as read
        if message.recipient_id != user_id:
            return jsonify({'error': 'Access denied'}), 403

        message.mark_as_read()
        db.session.commit()

        return jsonify({'message': 'Message marked as read'}), 200

    except Exception as e:
        db.session.rollback()
        log_error(current_app.logger, e)
        return jsonify({'error': 'Failed to mark message as read'}), 500


@messages_bp.route('/<int:message_id>/attachments', methods=['POST'])
@jwt_required()
@limiter.limit("10 per minute")
def upload_attachment(message_id):
    """Upload attachment to a message."""
    try:
        user_id = get_jwt_identity()

        # Verify message exists and user has access
        message = Message.query.get(message_id)
        if not message:
            return jsonify({'error': 'Message not found'}), 404

        if message.sender_id != user_id:
            return jsonify({'error': 'Access denied'}), 403

        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        attachment_type = request.form.get('attachment_type', 'file')

        if not file or file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Validate file type
        if not allowed_file(file.filename, attachment_type):
            return jsonify({'error': f'Invalid file type for {attachment_type}'}), 400

        # Validate file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        if file_size > MAX_FILE_SIZE:
            return jsonify({'error': f'File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB'}), 400

        # Generate secure filename and path
        filename = secure_filename(f"{message_id}_{file.filename}")
        filepath = os.path.join('uploads', 'messages', filename)

        # Ensure directory exists
        os.makedirs(os.path.dirname(filepath), exist_ok=True)

        # Calculate checksum
        file_content = file.read()
        checksum = hashlib.sha256(file_content).hexdigest()

        # Save file
        with open(filepath, 'wb') as f:
            f.write(file_content)

        # Create attachment record
        attachment = MessageAttachment(
            message_id=message_id,
            filename=filename,
            original_filename=file.filename,
            file_size=file_size,
            mime_type=file.mimetype,
            storage_path=filepath,
            checksum=checksum,
            attachment_type=attachment_type
        )

        db.session.add(attachment)
        db.session.commit()

        log_activity(
            user_id=user_id,
            action='attachment_uploaded',
            resource_type='message_attachment',
            resource_id=attachment.id,
            details={'message_id': message_id, 'filename': file.filename},
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            request_method=request.method,
            request_path=request.path
        )

        return jsonify({
            'message': 'Attachment uploaded successfully',
            'attachment': attachment.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        log_error(current_app.logger, e)
        return jsonify({'error': 'Failed to upload attachment'}), 500


@messages_bp.route('/contacts', methods=['GET'])
@jwt_required()
@limiter.limit("50 per minute")
def get_contacts():
    """Get user's contacts."""
    try:
        user_id = get_jwt_identity()

        contacts = Contact.query.filter_by(user_id=user_id).order_by(Contact.name).all()

        return jsonify({'contacts': [contact.to_dict() for contact in contacts]}), 200

    except Exception as e:
        log_error(current_app.logger, e)
        return jsonify({'error': 'Failed to get contacts'}), 500


@messages_bp.route('/contacts', methods=['POST'])
@jwt_required()
@limiter.limit("20 per minute")
def create_contact():
    """Create a new contact."""
    try:
        user_id = get_jwt_identity()

        data = request.get_json()

        if not data or not data.get('name'):
            return jsonify({'error': 'Contact name is required'}), 400

        name = sanitize_text(data.get('name'))
        email = data.get('email', '').strip().lower() if data.get('email') else None
        phone = sanitize_text(data.get('phone', '')) if data.get('phone') else None
        company = sanitize_text(data.get('company', '')) if data.get('company') else None
        notes = sanitize_text(data.get('notes', '')) if data.get('notes') else None

        # Validate email if provided
        if email:
            email_valid, email_error = validate_email(email)
            if not email_valid:
                return jsonify({'error': email_error}), 400

        contact = Contact(
            user_id=user_id,
            name=name,
            email=email,
            phone=phone,
            company=company,
            notes=notes
        )

        db.session.add(contact)
        db.session.commit()

        return jsonify({
            'message': 'Contact created successfully',
            'contact': contact.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        log_error(current_app.logger, e)
        return jsonify({'error': 'Failed to create contact'}), 500


@messages_bp.route('/contacts/<int:contact_id>', methods=['PUT'])
@jwt_required()
@limiter.limit("20 per minute")
def update_contact(contact_id):
    """Update a contact."""
    try:
        user_id = get_jwt_identity()

        contact = Contact.query.filter_by(id=contact_id, user_id=user_id).first()

        if not contact:
            return jsonify({'error': 'Contact not found'}), 404

        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Update fields
        if 'name' in data:
            contact.name = sanitize_text(data['name'])
        if 'email' in data:
            email = data['email'].strip().lower() if data['email'] else None
            if email:
                email_valid, email_error = validate_email(email)
                if not email_valid:
                    return jsonify({'error': email_error}), 400
            contact.email = email
        if 'phone' in data:
            contact.phone = sanitize_text(data['phone']) if data['phone'] else None
        if 'company' in data:
            contact.company = sanitize_text(data['company']) if data['company'] else None
        if 'notes' in data:
            contact.notes = sanitize_text(data['notes']) if data['notes'] else None

        contact.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'message': 'Contact updated successfully',
            'contact': contact.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        log_error(current_app.logger, e)
        return jsonify({'error': 'Failed to update contact'}), 500


@messages_bp.route('/contacts/<int:contact_id>', methods=['DELETE'])
@jwt_required()
@limiter.limit("20 per minute")
def delete_contact(contact_id):
    """Delete a contact."""
    try:
        user_id = get_jwt_identity()

        contact = Contact.query.filter_by(id=contact_id, user_id=user_id).first()

        if not contact:
            return jsonify({'error': 'Contact not found'}), 404

        db.session.delete(contact)
        db.session.commit()

        return jsonify({'message': 'Contact deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        log_error(current_app.logger, e)
        return jsonify({'error': 'Failed to delete contact'}), 500