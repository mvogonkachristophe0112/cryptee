#!/usr/bin/env python3
"""
Cryptee - Development Server Runner
Starts the Flask backend server for development.

Copyright (c) 2025 MvogoNka Christophe Ulrich
All rights reserved.
"""

import os
from backend.app import create_app

# Create the Flask app instance
app = create_app()

if __name__ == '__main__':
    # Run the development server
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        threaded=True
    )