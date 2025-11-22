"""
Email notification service for Cryptee application.
Handles sending emails for various application events.
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime
from flask import current_app, render_template_string
from threading import Thread
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending email notifications."""

    def __init__(self, app=None):
        if app:
            self.smtp_server = app.config.get('SMTP_SERVER', 'smtp.gmail.com')
            self.smtp_port = app.config.get('SMTP_PORT', 587)
            self.smtp_username = app.config.get('SMTP_USERNAME')
            self.smtp_password = app.config.get('SMTP_PASSWORD')
            self.from_email = app.config.get('FROM_EMAIL', self.smtp_username)
            self.app_name = app.config.get('APP_NAME', 'Cryptee')
            self.app_url = app.config.get('APP_URL', 'http://localhost:5000')
        else:
            # Lazy initialization for module-level instance
            self._initialized = False
            self.smtp_server = 'smtp.gmail.com'
            self.smtp_port = 587
            self.smtp_username = None
            self.smtp_password = None
            self.from_email = None
            self.app_name = 'Cryptee'
            self.app_url = 'http://localhost:5000'

    def _ensure_initialized(self):
        """Ensure the service is initialized with app context."""
        if not self._initialized and hasattr(self, '_initialized'):
            try:
                self.smtp_server = current_app.config.get('SMTP_SERVER', 'smtp.gmail.com')
                self.smtp_port = current_app.config.get('SMTP_PORT', 587)
                self.smtp_username = current_app.config.get('SMTP_USERNAME')
                self.smtp_password = current_app.config.get('SMTP_PASSWORD')
                self.from_email = current_app.config.get('FROM_EMAIL', self.smtp_username)
                self.app_name = current_app.config.get('APP_NAME', 'Cryptee')
                self.app_url = current_app.config.get('APP_URL', 'http://localhost:5000')
                self._initialized = True
            except RuntimeError:
                # Outside app context, use defaults
                pass

    def _get_email_template(self, template_name, **kwargs):
        """Get email template with context variables."""
        templates = {
            'share_notification': """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ app_name }} - File Shared</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .share-link { background: #e9ecef; padding: 15px; border-radius: 5px; word-break: break-all; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{ app_name }}</h1>
            <p>Secure File Sharing</p>
        </div>
        <div class="content">
            <h2>Hello {{ recipient_name }}!</h2>
            <p><strong>{{ sharer_name }}</strong> has shared a file with you:</p>

            <div class="share-link">
                <strong>File:</strong> {{ file_name }}<br>
                <strong>Size:</strong> {{ file_size }}<br>
                <strong>Expires:</strong> {{ expires_at }}
            </div>

            <p>To access this file, click the button below:</p>
            <a href="{{ share_url }}" class="button">Access Shared File</a>

            {% if password_required %}
            <p><strong>Note:</strong> This share link requires a password to access.</p>
            {% endif %}

            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <div class="share-link">{{ share_url }}</div>

            <p>This link will expire on {{ expires_at }}.</p>
        </div>
        <div class="footer">
            <p>This email was sent by {{ app_name }}. If you didn't expect this email, please ignore it.</p>
            <p>&copy; {{ year }} {{ app_name }}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
            """,

            'welcome_email': """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to {{ app_name }}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .features { margin: 20px 0; }
        .feature { margin: 10px 0; padding: 10px; background: white; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to {{ app_name }}!</h1>
            <p>Your secure file sharing journey begins here</p>
        </div>
        <div class="content">
            <h2>Hello {{ user_name }}!</h2>
            <p>Welcome to {{ app_name }}! Your account has been successfully created.</p>

            <div class="features">
                <h3>What you can do:</h3>
                <div class="feature">
                    <strong>🔒 Secure Uploads:</strong> Upload files with end-to-end encryption
                </div>
                <div class="feature">
                    <strong>📤 Easy Sharing:</strong> Share files with password protection and expiration dates
                </div>
                <div class="feature">
                    <strong>📁 File Management:</strong> Organize and version your files
                </div>
                <div class="feature">
                    <strong>📊 Activity Tracking:</strong> Monitor all file activities and access
                </div>
            </div>

            <a href="{{ app_url }}" class="button">Get Started</a>

            <p>If you have any questions, feel free to contact our support team.</p>
        </div>
        <div class="footer">
            <p>&copy; {{ year }} {{ app_name }}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
            """,

            'password_reset': """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ app_name }} - Password Reset</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{ app_name }}</h1>
            <p>Password Reset Request</p>
        </div>
        <div class="content">
            <h2>Password Reset</h2>
            <p>Hello {{ user_name }},</p>
            <p>You have requested to reset your password for your {{ app_name }} account.</p>

            <div class="warning">
                <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </div>

            <p>To reset your password, click the button below:</p>
            <a href="{{ reset_url }}" class="button">Reset Password</a>

            <p>This link will expire in 1 hour for security reasons.</p>

            <p>If the button doesn't work, copy and paste this URL into your browser:</p>
            <div style="background: #e9ecef; padding: 10px; border-radius: 5px; word-break: break-all; margin: 10px 0;">
                {{ reset_url }}
            </div>
        </div>
        <div class="footer">
            <p>&copy; {{ year }} {{ app_name }}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
            """
        }

        template = templates.get(template_name, '')
        if not template:
            return f"Template '{template_name}' not found"

        # Simple template rendering
        for key, value in kwargs.items():
            template = template.replace(f'{{{{ {key} }}}}', str(value))

        return template

    def _send_email_async(self, to_email, subject, html_content, attachments=None):
        """Send email asynchronously."""
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{self.app_name} <{self.from_email}>"
            msg['To'] = to_email
            msg['Subject'] = subject

            # Add HTML content
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)

            # Add attachments if any
            if attachments:
                for attachment in attachments:
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(attachment['content'])
                    encoders.encode_base64(part)
                    part.add_header('Content-Disposition',
                                  f'attachment; filename="{attachment["filename"]}"')
                    msg.attach(part)

            # Send email
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.smtp_username, self.smtp_password)
            server.sendmail(self.from_email, to_email, msg.as_string())
            server.quit()

            logger.info(f"Email sent successfully to {to_email}")

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            raise

    def send_email(self, to_email, subject, html_content, attachments=None):
        """Send email synchronously."""
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{self.app_name} <{self.from_email}>"
            msg['To'] = to_email
            msg['Subject'] = subject

            # Add HTML content
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)

            # Add attachments if any
            if attachments:
                for attachment in attachments:
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(attachment['content'])
                    encoders.encode_base64(part)
                    part.add_header('Content-Disposition',
                                  f'attachment; filename="{attachment["filename"]}"')
                    msg.attach(part)

            # Send email
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.smtp_username, self.smtp_password)
            server.sendmail(self.from_email, to_email, msg.as_string())
            server.quit()

            logger.info(f"Email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False

    def send_share_notification(self, recipient_email, recipient_name, sharer_name,
                               file_name, file_size, share_url, expires_at,
                               password_required=False):
        """Send notification when a file is shared."""
        subject = f"{self.app_name} - {sharer_name} shared a file with you"

        html_content = self._get_email_template('share_notification',
            app_name=self.app_name,
            recipient_name=recipient_name,
            sharer_name=sharer_name,
            file_name=file_name,
            file_size=file_size,
            share_url=share_url,
            expires_at=expires_at,
            password_required='true' if password_required else 'false',
            year=datetime.now().year
        )

        # Send asynchronously
        thread = Thread(target=self._send_email_async,
                       args=(recipient_email, subject, html_content))
        thread.start()

    def send_welcome_email(self, user_email, user_name):
        """Send welcome email to new users."""
        subject = f"Welcome to {self.app_name}!"

        html_content = self._get_email_template('welcome_email',
            app_name=self.app_name,
            user_name=user_name,
            app_url=self.app_url,
            year=datetime.now().year
        )

        # Send asynchronously
        thread = Thread(target=self._send_email_async,
                       args=(user_email, subject, html_content))
        thread.start()

    def send_password_reset_email(self, user_email, reset_url):
        """Send password reset email."""
        self._ensure_initialized()
        subject = f"{self.app_name} - Password Reset Request"

        html_content = self._get_email_template('password_reset',
            app_name=self.app_name,
            user_name=user_email.split('@')[0],  # Use email prefix as name
            reset_url=reset_url,
            year=datetime.now().year
        )

        # Send synchronously for password reset (important security email)
        return self.send_email(user_email, subject, html_content)


# Global email service instance (lazy initialized)
email_service = EmailService()


def send_share_notification(*args, **kwargs):
    """Convenience function to send share notifications."""
    return email_service.send_share_notification(*args, **kwargs)


def send_welcome_email(*args, **kwargs):
    """Convenience function to send welcome emails."""
    return email_service.send_welcome_email(*args, **kwargs)


def send_password_reset_email(*args, **kwargs):
    """Convenience function to send password reset emails."""
    return email_service.send_password_reset_email(*args, **kwargs)