"""
Configuration module for Cryptee application.
"""

from .development import DevelopmentConfig
try:
    from .production import ProductionConfig
except ValueError:
    # Production config requires environment variables
    ProductionConfig = None

# Import testing config if available
try:
    from .conftest import TestingConfig
except ImportError:
    TestingConfig = None

__all__ = ['DevelopmentConfig', 'ProductionConfig', 'TestingConfig']