#!/usr/bin/env python3
"""
Database migration script for Cryptee.
Adds missing columns to existing database.
"""

import sqlite3
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def migrate_database():
    """Add missing columns to the users table."""

    # Get database path from environment
    db_path = os.getenv('DATABASE_URL', 'sqlite:///cryptee_dev.db')
    if db_path.startswith('sqlite:///'):
        db_path = db_path.replace('sqlite:///', '')

    # If it's a relative path, make it relative to the backend directory
    if not os.path.isabs(db_path):
        db_path = os.path.join('backend', db_path)

    print(f"Migrating database: {db_path}")

    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check if cryptee_id column exists
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]

        print(f"Existing columns: {column_names}")

        # Add cryptee_id column if it doesn't exist
        if 'cryptee_id' not in column_names:
            print("Adding cryptee_id column...")
            cursor.execute("""
                ALTER TABLE users ADD COLUMN cryptee_id VARCHAR(16)
            """)
            print("+ Added cryptee_id column")
        else:
            print("+ cryptee_id column already exists")

        # Add public_key column if it doesn't exist
        if 'public_key' not in column_names:
            print("Adding public_key column...")
            cursor.execute("""
                ALTER TABLE users ADD COLUMN public_key TEXT
            """)
            print("+ Added public_key column")
        else:
            print("+ public_key column already exists")

        # Create indexes for the new columns
        try:
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_cryptee_id ON users(cryptee_id)")
            print("+ Created index on cryptee_id")
        except sqlite3.Error as e:
            print(f"Note: Could not create index on cryptee_id: {e}")

        # Populate existing users with Cryptee IDs and public keys
        cursor.execute("SELECT id, email FROM users WHERE cryptee_id IS NULL OR cryptee_id = ''")
        users_to_update = cursor.fetchall()

        if users_to_update:
            print(f"Updating {len(users_to_update)} existing users with Cryptee IDs and keys...")

            import hashlib
            import time
            from cryptography.hazmat.primitives.asymmetric import rsa
            from cryptography.hazmat.primitives import serialization

            for user_id, email in users_to_update:
                # Generate unique Cryptee ID
                cryptee_seed = f"{email.lower().strip()}_{int(time.time() * 1000000)}_{user_id}"
                cryptee_id = hashlib.sha256(cryptee_seed.encode()).hexdigest()[:16]

                # Generate RSA key pair
                private_key = rsa.generate_private_key(
                    public_exponent=65537,
                    key_size=2048
                )

                # Extract public key
                public_key = private_key.public_key()
                public_pem = public_key.public_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PublicFormat.SubjectPublicKeyInfo
                ).decode('utf-8')

                # Update user
                cursor.execute("""
                    UPDATE users
                    SET cryptee_id = ?, public_key = ?
                    WHERE id = ?
                """, (cryptee_id, public_pem, user_id))

            print(f"+ Updated {len(users_to_update)} users")
        else:
            print("+ All users already have Cryptee IDs")

        # Commit changes
        conn.commit()
        print("+ Database migration completed successfully!")

    except sqlite3.Error as e:
        print(f"ERROR: Database migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    migrate_database()