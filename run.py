#!/usr/bin/env python3
"""
Cryptee Application Runner
Entry point for running the Flask application with stability and error handling.

Copyright (c) 2025 MvogoNka Christophe Ulrich
All rights reserved.

This software is proprietary and confidential.
Unauthorized copying, modification, or distribution is strictly prohibited.
"""

import os
import sys
import signal
import logging
import atexit
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from backend.app import create_app, db

# Global app instance
app = None

def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    if app:
        # Close database connections
        with app.app_context():
            db.engine.dispose()
    sys.exit(0)

def setup_logging():
    """Set up application logging"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('cryptee.log', mode='a')
        ]
    )

def create_application():
    """Create and configure the Flask application"""
    global app
    try:
        app = create_app()

        # Test database connection and create tables
        with app.app_context():
            with db.engine.connect() as connection:
                connection.execute(db.text('SELECT 1'))

            # Create all tables
            db.create_all()

        return app
    except Exception as e:
        sys.exit(1)

def main():
    """Main application entry point"""
    # Set up signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Set up logging
    setup_logging()

    # Create application
    app = create_application()

    # Get port from environment or default to 5000
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '0.0.0.0')

    try:
        # Production-ready configuration for concurrent users
        app.run(
            host=host,
            port=port,
            debug=app.config.get('DEBUG', False),
            threaded=True,  # Enable threading for concurrent requests
            processes=1,    # Use threads instead of processes for better memory usage
            use_reloader=False  # Disable reloader in production
        )
    except Exception as e:
        sys.exit(1)

if __name__ == '__main__':
    main()