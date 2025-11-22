"""
Audit trail utilities for Cryptee application.
Tracks file access, modifications, and user activities.
"""

from datetime import datetime
from typing import Dict, Any, Optional
from flask import current_app
from .. import db


class AuditLog(db.Model):
    """Audit log model for tracking system activities."""

    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # User information
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), index=True)
    user_email = db.Column(db.String(120))  # Store email for historical reference

    # Activity information
    action = db.Column(db.String(50), nullable=False, index=True)  # upload, download, share, delete, etc.
    resource_type = db.Column(db.String(20), nullable=False)  # file, share, user, etc.
    resource_id = db.Column(db.Integer, index=True)

    # Request information
    ip_address = db.Column(db.String(45))  # IPv4/IPv6
    user_agent = db.Column(db.Text)
    request_method = db.Column(db.String(10))
    request_path = db.Column(db.String(500))

    # Additional metadata
    details = db.Column(db.Text)  # JSON string with additional information
    status = db.Column(db.String(20), default='success')  # success, failure, warning

    # Relationships
    user = db.relationship('User', backref=db.backref('audit_logs', lazy='dynamic'))

    def __init__(self, user_id: int, action: str, resource_type: str,
                 resource_id: Optional[int] = None, details: Optional[Dict[str, Any]] = None,
                 status: str = 'success', ip_address: str = None,
                 user_agent: str = None, request_method: str = None,
                 request_path: str = None, user_email: str = None):
        self.user_id = user_id
        self.action = action
        self.resource_type = resource_type
        self.resource_id = resource_id
        self.status = status
        self.ip_address = ip_address
        self.user_agent = user_agent
        self.request_method = request_method
        self.request_path = request_path
        self.user_email = user_email

        if details:
            import json
            self.details = json.dumps(details)

    def to_dict(self) -> Dict[str, Any]:
        """Convert audit log to dictionary."""
        import json

        data = {
            'id': self.id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'user_id': self.user_id,
            'user_email': self.user_email,
            'action': self.action,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'request_method': self.request_method,
            'request_path': self.request_path,
            'status': self.status
        }

        if self.details:
            try:
                data['details'] = json.loads(self.details)
            except json.JSONDecodeError:
                data['details'] = self.details

        return data


def log_activity(user_id: int, action: str, resource_type: str,
                resource_id: Optional[int] = None, details: Optional[Dict[str, Any]] = None,
                status: str = 'success', ip_address: str = None,
                user_agent: str = None, request_method: str = None,
                request_path: str = None, user_email: str = None) -> AuditLog:
    """
    Log an activity to the audit trail.

    Args:
        user_id: ID of the user performing the action
        action: Action performed (upload, download, share, delete, etc.)
        resource_type: Type of resource (file, share, user, etc.)
        resource_id: ID of the resource (optional)
        details: Additional details about the action
        status: Status of the action (success, failure, warning)
        ip_address: IP address of the request
        user_agent: User agent string
        request_method: HTTP method
        request_path: Request path
        user_email: User email for historical reference

    Returns:
        Created AuditLog instance
    """
    try:
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            status=status,
            ip_address=ip_address,
            user_agent=user_agent,
            request_method=request_method,
            request_path=request_path,
            user_email=user_email
        )

        db.session.add(audit_log)
        db.session.commit()

        # Log to application logger as well
        logger = current_app.logger
        log_message = f"AUDIT: {action} on {resource_type}"
        if resource_id:
            log_message += f" (ID: {resource_id})"
        log_message += f" by user {user_id} - {status}"

        if status == 'success':
            logger.info(log_message)
        elif status == 'failure':
            logger.error(log_message)
        else:
            logger.warning(log_message)

        return audit_log

    except Exception as e:
        # Don't let audit logging break the main application
        current_app.logger.error(f"Failed to log audit activity: {e}")
        db.session.rollback()
        return None


def get_audit_logs(user_id: Optional[int] = None, action: Optional[str] = None,
                  resource_type: Optional[str] = None, status: Optional[str] = None,
                  limit: int = 100, offset: int = 0) -> list:
    """
    Retrieve audit logs with optional filtering.

    Args:
        user_id: Filter by user ID
        action: Filter by action
        resource_type: Filter by resource type
        status: Filter by status
        limit: Maximum number of records to return
        offset: Number of records to skip

    Returns:
        List of audit log dictionaries
    """
    try:
        query = AuditLog.query

        if user_id:
            query = query.filter_by(user_id=user_id)
        if action:
            query = query.filter_by(action=action)
        if resource_type:
            query = query.filter_by(resource_type=resource_type)
        if status:
            query = query.filter_by(status=status)

        query = query.order_by(AuditLog.timestamp.desc()).limit(limit).offset(offset)

        logs = query.all()
        return [log.to_dict() for log in logs]

    except Exception as e:
        current_app.logger.error(f"Failed to retrieve audit logs: {e}")
        return []


def get_user_activity_summary(user_id: int, days: int = 30) -> Dict[str, Any]:
    """
    Get activity summary for a user over the specified number of days.

    Args:
        user_id: User ID
        days: Number of days to look back

    Returns:
        Dictionary with activity summary
    """
    try:
        from datetime import timedelta
        from sqlalchemy import func

        cutoff_date = datetime.utcnow() - timedelta(days=days)

        # Count activities by action
        activity_counts = db.session.query(
            AuditLog.action,
            func.count(AuditLog.id).label('count')
        ).filter(
            AuditLog.user_id == user_id,
            AuditLog.timestamp >= cutoff_date
        ).group_by(AuditLog.action).all()

        summary = {
            'user_id': user_id,
            'period_days': days,
            'total_activities': sum(count for _, count in activity_counts),
            'activities_by_type': {action: count for action, count in activity_counts}
        }

        return summary

    except Exception as e:
        current_app.logger.error(f"Failed to get user activity summary: {e}")
        return {'error': str(e)}


def cleanup_old_logs(days_to_keep: int = 365) -> int:
    """
    Clean up audit logs older than specified days.

    Args:
        days_to_keep: Number of days of logs to keep

    Returns:
        Number of logs deleted
    """
    try:
        from datetime import timedelta

        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)

        deleted_count = AuditLog.query.filter(
            AuditLog.timestamp < cutoff_date
        ).delete()

        db.session.commit()

        current_app.logger.info(f"Cleaned up {deleted_count} old audit logs")
        return deleted_count

    except Exception as e:
        current_app.logger.error(f"Failed to cleanup old audit logs: {e}")
        db.session.rollback()
        return 0