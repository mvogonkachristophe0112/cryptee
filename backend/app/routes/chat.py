"""
Chat API endpoints for Cryptee secure messaging.
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_, and_, desc
from datetime import datetime, timedelta
import hashlib

from .. import db, limiter
from ..models import User, ChatConversation, ChatMessage, ChatTheme, ChatSettings

chat_bp = Blueprint('chat', __name__)


@chat_bp.route('/profile', methods=['GET'])
@jwt_required()
@limiter.limit("50 per minute")
def get_chat_profile():
    """Get current user's chat profile information."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        return jsonify({
            'username': user.username,
            'cryptee_id': user.cryptee_id,
            'public_key': user.public_key,
            'full_name': user.get_full_name(),
            'email': user.email
        })

    except Exception as e:
        current_app.logger.error(f'Error getting chat profile: {e}')
        return jsonify({'error': 'Failed to get chat profile'}), 500


@chat_bp.route('/conversations', methods=['GET'])
@jwt_required()
@limiter.limit("100 per minute")
def get_conversations():
    """Get user's chat conversations."""
    try:
        user_id = get_jwt_identity()

        # Get all conversations where user is a participant
        conversations = ChatConversation.query.filter(
            or_(ChatConversation.participant1_id == user_id,
                ChatConversation.participant2_id == user_id)
        ).filter_by(is_active=True).order_by(desc(ChatConversation.last_message_at)).all()

        result = []
        for conv in conversations:
            conv_data = conv.to_dict(user_id)
            # Add unread message count
            unread_count = ChatMessage.query.filter_by(
                conversation_id=conv.id,
                sender_id=conv.get_other_participant(user_id).id if conv.get_other_participant(user_id) else None,
                is_read=False,
                is_deleted=False
            ).count()
            conv_data['unread_count'] = unread_count
            result.append(conv_data)

        return jsonify({
            'conversations': result,
            'total': len(result)
        })

    except Exception as e:
        current_app.logger.error(f'Error getting conversations: {e}')
        return jsonify({'error': 'Failed to load conversations'}), 500


@chat_bp.route('/conversations/<conversation_id>', methods=['GET'])
@jwt_required()
@limiter.limit("200 per minute")
def get_conversation(conversation_id):
    """Get a specific conversation with messages."""
    try:
        user_id = get_jwt_identity()

        # Find conversation
        conversation = ChatConversation.query.filter_by(conversation_id=conversation_id).first()
        if not conversation:
            return jsonify({'error': 'Conversation not found'}), 404

        # Check if user is participant
        if conversation.participant1_id != user_id and conversation.participant2_id != user_id:
            return jsonify({'error': 'Access denied'}), 403

        # Get messages (limit to last 100 for performance)
        messages = ChatMessage.query.filter_by(
            conversation_id=conversation.id,
            is_deleted=False
        ).order_by(ChatMessage.created_at.desc()).limit(100).all()

        # Reverse to get chronological order
        messages.reverse()

        # Mark messages as read
        other_participant_id = conversation.get_other_participant(user_id).id
        unread_messages = ChatMessage.query.filter_by(
            conversation_id=conversation.id,
            sender_id=other_participant_id,
            is_read=False,
            is_deleted=False
        ).all()

        for msg in unread_messages:
            msg.mark_as_read()

        db.session.commit()

        return jsonify({
            'conversation': conversation.to_dict(user_id),
            'messages': [msg.to_dict() for msg in messages]
        })

    except Exception as e:
        current_app.logger.error(f'Error getting conversation: {e}')
        return jsonify({'error': 'Failed to load conversation'}), 500


@chat_bp.route('/conversations', methods=['POST'])
@jwt_required()
@limiter.limit("20 per minute")
def create_conversation():
    """Create a new chat conversation."""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        if not data or 'recipient' not in data:
            return jsonify({'error': 'Recipient is required'}), 400

        recipient_identifier = data['recipient'].strip()

        # Find recipient by username, email, or cryptee ID
        recipient = None

        # Try username first
        recipient = User.query.filter_by(username=recipient_identifier).first()

        # Try email if not found
        if not recipient:
            recipient = User.query.filter_by(email=recipient_identifier).first()

        # Try cryptee ID
        if not recipient:
            recipient = User.query.filter_by(cryptee_id=recipient_identifier).first()

        if not recipient:
            return jsonify({'error': 'Recipient not found'}), 404

        if recipient.id == user_id:
            return jsonify({'error': 'Cannot start conversation with yourself'}), 400

        # Check if conversation already exists
        existing_conversation = ChatConversation.query.filter(
            or_(
                and_(ChatConversation.participant1_id == user_id,
                     ChatConversation.participant2_id == recipient.id),
                and_(ChatConversation.participant1_id == recipient.id,
                     ChatConversation.participant2_id == user_id)
            )
        ).first()

        if existing_conversation:
            return jsonify({
                'conversation': existing_conversation.to_dict(user_id),
                'message': 'Conversation already exists'
            })

        # Get user info
        user = User.query.get(user_id)

        # Create new conversation
        conversation = ChatConversation(
            participant1_id=user_id,
            participant2_id=recipient.id,
            participant1_username=user.username,
            participant2_username=recipient.username
        )

        db.session.add(conversation)
        db.session.commit()

        return jsonify({
            'conversation': conversation.to_dict(user_id),
            'message': 'Conversation created successfully'
        }), 201

    except Exception as e:
        current_app.logger.error(f'Error creating conversation: {e}')
        db.session.rollback()
        return jsonify({'error': 'Failed to create conversation'}), 500


@chat_bp.route('/messages', methods=['POST'])
@jwt_required()
@limiter.limit("100 per minute")
def send_message():
    """Send a chat message."""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        if not data or 'conversation_id' not in data or 'content' not in data:
            return jsonify({'error': 'Conversation ID and content are required'}), 400

        conversation_id = data['conversation_id']
        content = data['content'].strip()
        message_type = data.get('message_type', 'text')
        expires_in_hours = data.get('expires_in', 0)  # Hours until message expires

        if not content and message_type == 'text':
            return jsonify({'error': 'Message content cannot be empty'}), 400

        # Find conversation
        conversation = ChatConversation.query.filter_by(conversation_id=conversation_id).first()
        if not conversation:
            return jsonify({'error': 'Conversation not found'}), 404

        # Check if user is participant
        if conversation.participant1_id != user_id and conversation.participant2_id != user_id:
            return jsonify({'error': 'Access denied'}), 403

        # Check chat settings and anti-brute force
        settings = ChatSettings.query.filter_by(user_id=user_id).first()
        if not settings:
            settings = ChatSettings(user_id=user_id)
            db.session.add(settings)

        if settings.is_locked():
            return jsonify({'error': 'Chat is temporarily locked due to security concerns'}), 429

        # Calculate expiration time
        expires_at = None
        if expires_in_hours > 0:
            expires_at = datetime.utcnow() + timedelta(hours=expires_in_hours)

        # Create message
        message = ChatMessage(
            conversation_id=conversation.id,
            sender_id=user_id,
            content=content,
            message_type=message_type,
            expires_at=expires_at
        )

        db.session.add(message)

        # Update conversation last message
        conversation.update_last_message(content)

        db.session.commit()

        # Reset failed attempts on successful message
        settings.reset_failed_attempts()
        db.session.commit()

        return jsonify({
            'message': message.to_dict(),
            'conversation': conversation.to_dict(user_id)
        }), 201

    except Exception as e:
        current_app.logger.error(f'Error sending message: {e}')
        db.session.rollback()
        return jsonify({'error': 'Failed to send message'}), 500


@chat_bp.route('/messages/<int:message_id>', methods=['DELETE'])
@jwt_required()
@limiter.limit("50 per minute")
def delete_message(message_id):
    """Delete a chat message (soft delete)."""
    try:
        user_id = get_jwt_identity()

        message = ChatMessage.query.get(message_id)
        if not message:
            return jsonify({'error': 'Message not found'}), 404

        # Check if user is sender
        if message.sender_id != user_id:
            return jsonify({'error': 'Access denied'}), 403

        message.mark_as_deleted()
        db.session.commit()

        return jsonify({'message': 'Message deleted successfully'})

    except Exception as e:
        current_app.logger.error(f'Error deleting message: {e}')
        db.session.rollback()
        return jsonify({'error': 'Failed to delete message'}), 500


@chat_bp.route('/settings', methods=['GET', 'PUT'])
@jwt_required()
@limiter.limit("30 per minute")
def chat_settings():
    """Get or update chat settings."""
    try:
        user_id = get_jwt_identity()

        settings = ChatSettings.query.filter_by(user_id=user_id).first()
        if not settings:
            settings = ChatSettings(user_id=user_id)
            db.session.add(settings)
            db.session.commit()

        if request.method == 'GET':
            return jsonify(settings.to_dict())

        elif request.method == 'PUT':
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400

            # Update allowed fields
            allowed_fields = [
                'allow_strangers', 'show_online_status', 'read_receipts',
                'message_expiration_default', 'encrypt_messages',
                'desktop_notifications', 'sound_notifications', 'email_notifications'
            ]

            for field in allowed_fields:
                if field in data:
                    setattr(settings, field, data[field])

            settings.updated_at = datetime.utcnow()
            db.session.commit()

            return jsonify({
                'settings': settings.to_dict(),
                'message': 'Settings updated successfully'
            })

    except Exception as e:
        current_app.logger.error(f'Error managing chat settings: {e}')
        db.session.rollback()
        return jsonify({'error': 'Failed to manage settings'}), 500


@chat_bp.route('/themes', methods=['GET'])
@jwt_required()
@limiter.limit("50 per minute")
def get_themes():
    """Get user's chat themes."""
    try:
        user_id = get_jwt_identity()

        themes = ChatTheme.query.filter_by(user_id=user_id).order_by(ChatTheme.created_at).all()

        return jsonify({
            'themes': [theme.to_dict() for theme in themes],
            'total': len(themes)
        })

    except Exception as e:
        current_app.logger.error(f'Error getting themes: {e}')
        return jsonify({'error': 'Failed to load themes'}), 500


@chat_bp.route('/themes', methods=['POST'])
@jwt_required()
@limiter.limit("20 per minute")
def create_theme():
    """Create a new chat theme."""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        if not data or 'theme_name' not in data:
            return jsonify({'error': 'Theme name is required'}), 400

        theme_name = data['theme_name'].strip()
        if not theme_name:
            return jsonify({'error': 'Theme name cannot be empty'}), 400

        # Check if theme name already exists for user
        existing = ChatTheme.query.filter_by(user_id=user_id, theme_name=theme_name).first()
        if existing:
            return jsonify({'error': 'Theme name already exists'}), 409

        # Create theme with provided data
        theme_data = {k: v for k, v in data.items() if k != 'theme_name'}
        theme = ChatTheme(user_id=user_id, theme_name=theme_name, **theme_data)

        db.session.add(theme)
        db.session.commit()

        return jsonify({
            'theme': theme.to_dict(),
            'message': 'Theme created successfully'
        }), 201

    except Exception as e:
        current_app.logger.error(f'Error creating theme: {e}')
        db.session.rollback()
        return jsonify({'error': 'Failed to create theme'}), 500


@chat_bp.route('/themes/<int:theme_id>', methods=['PUT', 'DELETE'])
@jwt_required()
@limiter.limit("30 per minute")
def manage_theme(theme_id):
    """Update or delete a chat theme."""
    try:
        user_id = get_jwt_identity()

        theme = ChatTheme.query.filter_by(id=theme_id, user_id=user_id).first()
        if not theme:
            return jsonify({'error': 'Theme not found'}), 404

        if request.method == 'PUT':
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400

            # Update theme fields
            updatable_fields = [
                'primary_color', 'secondary_color', 'background_color',
                'text_color', 'accent_color', 'font_family', 'font_size',
                'bubble_style', 'show_timestamps', 'show_sender_names',
                'background_image', 'background_opacity'
            ]

            for field in updatable_fields:
                if field in data:
                    setattr(theme, field, data[field])

            theme.updated_at = datetime.utcnow()
            db.session.commit()

            return jsonify({
                'theme': theme.to_dict(),
                'message': 'Theme updated successfully'
            })

        elif request.method == 'DELETE':
            if theme.is_default:
                return jsonify({'error': 'Cannot delete default theme'}), 400

            db.session.delete(theme)
            db.session.commit()

            return jsonify({'message': 'Theme deleted successfully'})

    except Exception as e:
        current_app.logger.error(f'Error managing theme: {e}')
        db.session.rollback()
        return jsonify({'error': 'Failed to manage theme'}), 500


@chat_bp.route('/users/search', methods=['GET'])
@jwt_required()
@limiter.limit("50 per minute")
def search_users():
    """Search for users to start conversations with."""
    try:
        user_id = get_jwt_identity()
        query = request.args.get('q', '').strip()

        if not query or len(query) < 2:
            return jsonify({'users': [], 'total': 0})

        # Search by username, email, or cryptee ID (partial matches)
        users = User.query.filter(
            User.id != user_id,  # Exclude current user
            or_(
                User.username.ilike(f'%{query}%'),
                User.email.ilike(f'%{query}%'),
                User.cryptee_id.ilike(f'%{query}%')
            )
        ).limit(20).all()

        result = []
        for user in users:
            result.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'cryptee_id': user.cryptee_id,
                'public_key': user.public_key,
                'full_name': user.get_full_name(),
                'is_online': True  # TODO: Implement online status
            })

        return jsonify({
            'users': result,
            'total': len(result),
            'query': query
        })

    except Exception as e:
        current_app.logger.error(f'Error searching users: {e}')
        return jsonify({'error': 'Failed to search users'}), 500


@chat_bp.route('/conversations/<conversation_id>/read', methods=['POST'])
@jwt_required()
@limiter.limit("100 per minute")
def mark_conversation_read(conversation_id):
    """Mark all messages in a conversation as read."""
    try:
        user_id = get_jwt_identity()

        conversation = ChatConversation.query.filter_by(conversation_id=conversation_id).first()
        if not conversation:
            return jsonify({'error': 'Conversation not found'}), 404

        if conversation.participant1_id != user_id and conversation.participant2_id != user_id:
            return jsonify({'error': 'Access denied'}), 403

        # Mark all unread messages from other participant as read
        other_participant_id = conversation.get_other_participant(user_id).id
        unread_messages = ChatMessage.query.filter_by(
            conversation_id=conversation.id,
            sender_id=other_participant_id,
            is_read=False,
            is_deleted=False
        ).all()

        for msg in unread_messages:
            msg.mark_as_read()

        db.session.commit()

        return jsonify({
            'message': f'Marked {len(unread_messages)} messages as read',
            'marked_count': len(unread_messages)
        })

    except Exception as e:
        current_app.logger.error(f'Error marking conversation read: {e}')
        db.session.rollback()
        return jsonify({'error': 'Failed to mark messages as read'}), 500