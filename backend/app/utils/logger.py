"""
Logging utilities for Cryptee application.
"""

import logging
import logging.handlers
from pathlib import Path
from flask import current_app, request
import time


def setup_logger(name: str = 'cryptee', level: str = 'INFO') -> logging.Logger:
    """Set up application logger with file and console handlers."""

    logger = logging.getLogger(name)

    # Avoid duplicate handlers
    if logger.handlers:
        return logger

    # Set log level
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    logger.setLevel(numeric_level)

    # Create formatters
    file_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s - %(pathname)s:%(lineno)d'
    )
    console_formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s'
    )

    # File handler - only set up if we have app context
    try:
        if current_app:
            log_dir = Path(current_app.config.get('LOG_FILE', 'logs')).parent
            log_dir.mkdir(exist_ok=True)

            file_handler = logging.handlers.RotatingFileHandler(
                current_app.config.get('LOG_FILE', 'logs/cryptee.log'),
                maxBytes=10*1024*1024,  # 10MB
                backupCount=5
            )
            file_handler.setFormatter(file_formatter)
            logger.addHandler(file_handler)
    except RuntimeError:
        # No app context available
        pass
    except Exception as e:
        print(f"Failed to set up file logging: {e}")

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)

    return logger


def log_request_info(logger: logging.Logger, user_id: int = None):
    """Log request information for debugging and audit purposes."""
    try:
        if request:
            logger.info(
                f"Request: {request.method} {request.path} - "
                f"IP: {request.remote_addr} - "
                f"User-Agent: {request.headers.get('User-Agent', 'Unknown')} - "
                f"User: {user_id or 'Anonymous'}"
            )
    except Exception as e:
        logger.error(f"Failed to log request info: {e}")


def log_error(logger: logging.Logger, error: Exception, user_id: int = None):
    """Log error with context information."""
    try:
        logger.error(
            f"Error: {str(error)} - "
            f"Type: {type(error).__name__} - "
            f"User: {user_id or 'Anonymous'} - "
            f"Path: {request.path if request else 'Unknown'}"
        )
    except Exception as e:
        logger.error(f"Failed to log error: {e}")


class RequestLogger:
    """Context manager for logging request timing and errors."""

    def __init__(self, logger: logging.Logger, user_id: int = None):
        self.logger = logger
        self.user_id = user_id
        self.start_time = None

    def __enter__(self):
        self.start_time = time.time()
        log_request_info(self.logger, self.user_id)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.time() - self.start_time
        if exc_type:
            log_error(self.logger, exc_val, self.user_id)
            self.logger.warning(f"Request failed in {duration:.2f}s")
        else:
            self.logger.info(f"Request completed in {duration:.2f}s")