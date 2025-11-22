"""
Database models package for Cryptee application.
"""

# Import db from the main app - it will be initialized there
from .. import db

from .user import User
from .file import File
from .share import Share
from .message import Message, MessageAttachment, Contact
from .file_version import FileVersion
from .chat import ChatConversation, ChatMessage, ChatTheme, ChatSettings

__all__ = ['db', 'User', 'File', 'Share', 'FileVersion', 'ChatConversation', 'ChatMessage', 'ChatTheme', 'ChatSettings']