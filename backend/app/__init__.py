"""
Cryptee - Secure Encrypted Data Sharing Web Application
Main Flask application factory and configuration.

Copyright (c) 2025 MvogoNka Christophe Ulrich
All rights reserved.

This software is proprietary and confidential.
Unauthorized copying, modification, or distribution is strictly prohibited.
"""

import os
import time
import logging
from flask import Flask, current_app, request, g, redirect, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from sqlalchemy import text
import redis

# Initialize extensions
db = SQLAlchemy()
jwt = JWTManager()
limiter = Limiter(key_func=get_remote_address)

def create_app(config_name=None):
    """
    Application factory pattern for creating Flask app instances.

    Args:
        config_name: Configuration environment name

    Returns:
        Flask application instance
    """
    app = Flask(__name__)

    # Load configuration
    if config_name:
        config_class = f'backend.app.config.{config_name.capitalize()}Config'
        app.config.from_object(config_class)
    else:
        # Load from environment or default config
        config_module = os.getenv('FLASK_ENV', 'development')
        config_class = f'backend.app.config.{config_module.capitalize()}Config'
        app.config.from_object(config_class)

    # Load environment variables
    app.config.from_envvar('CRYPTEE_SETTINGS', silent=True)

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)

    # Middleware for concurrent user optimization
    @app.before_request
    def before_request():
        """Set up request context for concurrent users"""
        g.start_time = time.time()
        g.request_id = f"{int(time.time() * 1000000)}"

    @app.after_request
    def after_request(response):
        """Log request timing and cleanup for concurrent users"""
        if hasattr(g, 'start_time'):
            duration = time.time() - g.start_time
            current_app.logger.info(f"Request {g.request_id} completed in {duration:.3f}s")

            # Log slow requests (>1 second)
            if duration > 1.0:
                current_app.logger.warning(f"SLOW REQUEST: {request.method} {request.path} took {duration:.3f}s")

        return response

    @app.teardown_request
    def teardown_request(exception):
        """Clean up resources after each request"""
        if exception:
            current_app.logger.error(f"Request error: {exception}")

    # Set up logging (will be initialized with app context later)
    from .utils.logger import setup_logger
    # app.logger will be set up when first accessed

    # Configure CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": app.config.get('CORS_ORIGINS', '*'),
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "expose_headers": ["X-Total-Count"],
            "supports_credentials": True
        }
    })

    # Configure rate limiting
    if app.config.get('REDIS_URL'):
        limiter.init_app(app)
        # Set up Redis connection for rate limiting
        redis_client = redis.from_url(app.config['REDIS_URL'])
        limiter.storage = redis_client
    else:
        limiter.init_app(app)

    # Register blueprints
    from .routes.auth import auth_bp
    from .routes.files import files_bp
    from .routes.shares import shares_bp
    from .routes.users import users_bp
    from .routes.messages import messages_bp
    from .routes.chat import chat_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(files_bp, url_prefix='/api/files')
    app.register_blueprint(shares_bp, url_prefix='/api/shares')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(messages_bp, url_prefix='/api/messages')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')

    # Additional API endpoints for new features
    from flask_jwt_extended import jwt_required

    @app.route('/api/settings', methods=['GET', 'POST'])
    @jwt_required()
    def settings():
        if request.method == 'GET':
            return jsonify({
                'language': request.args.get('lang', 'en'),
                'theme': request.args.get('theme', 'light'),
                'notifications': True
            })
        else:
            # Save settings
            return jsonify({'message': 'Settings saved'})

    @app.route('/api/history', methods=['GET'])
    @jwt_required()
    def history():
        # Mock history data
        return jsonify([
            {'id': 1, 'action': 'File sent', 'details': 'photo.jpg', 'timestamp': '2025-11-11T10:00:00Z'},
            {'id': 2, 'action': 'File received', 'details': 'document.pdf', 'timestamp': '2025-11-11T09:30:00Z'},
        ])

    @app.route('/api/feedback', methods=['POST'])
    @jwt_required()
    def feedback():
        data = request.get_json()
        # Process feedback
        return jsonify({'message': 'Feedback submitted'})

    @app.route('/api/rate', methods=['POST'])
    @jwt_required()
    def rate_app():
        data = request.get_json()
        # Process rating
        return jsonify({'message': 'Rating submitted'})

    @app.route('/api/bug-report', methods=['POST'])
    @jwt_required()
    def bug_report():
        data = request.get_json()
        # Process bug report
        return jsonify({'message': 'Bug report submitted'})

    # Health check endpoint
    @app.route('/health')
    def health_check():
        """Comprehensive health check for monitoring and load balancers"""
        health_status = {
            'status': 'healthy',
            'service': 'cryptee',
            'version': '1.0.0',
            'timestamp': time.time()
        }

        try:
            # Check database connection by trying to connect
            with db.engine.connect() as connection:
                # Just test the connection without executing a query
                pass
            health_status['database'] = 'connected'
        except Exception as e:
            health_status['status'] = 'unhealthy'
            health_status['database'] = f'error: {str(e)}'
            current_app.logger.error(f'Database health check failed: {e}')

        # Check Redis if configured
        if app.config.get('REDIS_URL'):
            try:
                import redis
                redis_client = redis.from_url(app.config['REDIS_URL'])
                redis_client.ping()
                health_status['redis'] = 'connected'
            except Exception as e:
                health_status['redis'] = f'error: {str(e)}'
                if health_status['status'] == 'healthy':
                    health_status['status'] = 'degraded'

        # Check file system permissions
        try:
            uploads_dir = app.config.get('UPLOAD_FOLDER', 'backend/uploads')
            os.makedirs(uploads_dir, exist_ok=True)
            test_file = os.path.join(uploads_dir, '.health_check')
            with open(test_file, 'w') as f:
                f.write('health_check')
            os.remove(test_file)
            health_status['filesystem'] = 'writable'
        except Exception as e:
            health_status['filesystem'] = f'error: {str(e)}'
            health_status['status'] = 'unhealthy'

        # Return appropriate HTTP status
        status_code = 200 if health_status['status'] == 'healthy' else 503
        return health_status, status_code

    # Serve React app for all non-API routes
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_react_app(path):
        # Skip API routes and health checks
        if path.startswith('api/') or path.startswith('health'):
            return {'error': 'Not found'}, 404

        # Try to serve from built React app first
        build_path = os.path.join(app.root_path, '..', '..', 'frontend', 'build', path)

        # If it's a file that exists, serve it
        if os.path.isfile(build_path):
            return app.send_static_file(build_path)

        # For directories or root, serve index.html
        index_path = os.path.join(app.root_path, '..', '..', 'frontend', 'build', 'index.html')
        if os.path.isfile(index_path):
            with open(index_path, 'r', encoding='utf-8') as f:
                return f.read(), 200, {'Content-Type': 'text/html'}

        # Fallback to old static serving
        return serve_page_content('home')

    def serve_page_content(page_name):
        # Read the base HTML
        with app.open_resource('static/index.html') as f:
            html_content = f.read().decode('utf-8')

        # For about page, inject a script to set initial page before JavaScript runs
        if page_name == 'about':
            initial_script = """
            <script>
            // Set initial page for about route before main JS runs
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(function() {
                    showPage('about');
                    updateNavButtons();
                }, 10);
            });
            </script>
            """
            # Insert before closing body tag
            html_content = html_content.replace('</body>', initial_script + '</body>')

        response = app.response_class(html_content, mimetype='text/html')
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response

    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return {'error': 'Not found'}, 404

    @app.errorhandler(500)
    def internal_error(error):
        app.logger.error(f'Internal server error: {error}')
        return {'error': 'Internal server error'}, 500

    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        """Handle rate limiting for concurrent users"""
        return {'error': 'Too many requests. Please try again later.'}, 429

    @app.errorhandler(503)
    def service_unavailable(error):
        """Handle high load situations"""
        return {'error': 'Service temporarily unavailable. Please try again.'}, 503

    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return {'error': 'Token has expired'}, 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        current_app.logger.error(f'Invalid token error: {error}')
        return {'error': 'Invalid token'}, 401

    @jwt.unauthorized_loader
    def unauthorized_callback(error):
        return {'error': 'Missing authorization header'}, 401

    return app