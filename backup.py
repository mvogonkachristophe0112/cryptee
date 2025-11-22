#!/usr/bin/env python3
"""
Cryptee Database Backup Script
Creates automated backups of the database and uploaded files.

Copyright (c) 2025 MvogoNka Christophe Ulrich
All rights reserved.
"""

import os
import sys
import shutil
import datetime
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backup.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

class CrypteeBackup:
    """Handles database and file backups for Cryptee"""

    def __init__(self):
        self.backup_dir = Path('backups')
        self.backup_dir.mkdir(exist_ok=True)

        self.database_url = os.getenv('DATABASE_URL', '')
        self.upload_folder = Path(os.getenv('UPLOAD_FOLDER', 'backend/uploads'))

        # Retention settings
        self.retention_days = int(os.getenv('BACKUP_RETENTION_DAYS', '30'))

    def create_timestamp(self):
        """Create a timestamp string for backup files"""
        return datetime.datetime.now().strftime('%Y%m%d_%H%M%S')

    def backup_database(self):
        """Create a database backup"""
        if not self.database_url:
            logging.warning("No DATABASE_URL configured, skipping database backup")
            return None

        try:
            import pymysql
            from urllib.parse import urlparse

            # Parse database URL
            parsed = urlparse(self.database_url)
            db_config = {
                'host': parsed.hostname,
                'user': parsed.username,
                'password': parsed.password,
                'database': parsed.path.lstrip('/'),
                'port': parsed.port or 3306
            }

            # Create backup filename
            timestamp = self.create_timestamp()
            backup_file = self.backup_dir / f"cryptee_db_{timestamp}.sql"

            # Use mysqldump if available, otherwise fallback to SQL export
            import subprocess
            cmd = [
                'mysqldump',
                f"--host={db_config['host']}",
                f"--user={db_config['user']}",
                f"--password={db_config['password']}",
                db_config['database']
            ]

            with open(backup_file, 'w') as f:
                result = subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE, text=True)

            if result.returncode == 0:
                logging.info(f"Database backup created: {backup_file}")
                return backup_file
            else:
                logging.error(f"Database backup failed: {result.stderr}")
                return None

        except ImportError:
            logging.warning("mysqldump not available, using SQLAlchemy backup")
            return self.backup_database_sqlalchemy()
        except Exception as e:
            logging.error(f"Database backup failed: {e}")
            return None

    def backup_database_sqlalchemy(self):
        """Fallback database backup using SQLAlchemy"""
        try:
            from backend.app import create_app, db

            app = create_app()
            with app.app_context():
                # Get all table data
                from sqlalchemy import text
                tables = db.engine.table_names()

                timestamp = self.create_timestamp()
                backup_file = self.backup_dir / f"cryptee_db_{timestamp}.sql"

                with open(backup_file, 'w') as f:
                    f.write("-- Cryptee Database Backup\n")
                    f.write(f"-- Created: {datetime.datetime.now()}\n\n")

                    for table in tables:
                        # Get table schema
                        schema_result = db.engine.execute(text(f"SHOW CREATE TABLE {table}"))
                        create_stmt = schema_result.fetchone()[1]
                        f.write(f"{create_stmt};\n\n")

                        # Get table data
                        data_result = db.engine.execute(text(f"SELECT * FROM {table}"))
                        columns = data_result.keys()

                        for row in data_result:
                            values = []
                            for value in row:
                                if value is None:
                                    values.append('NULL')
                                elif isinstance(value, str):
                                    values.append(f"'{value.replace(chr(39), chr(39)*2)}'")
                                else:
                                    values.append(str(value))

                            f.write(f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({', '.join(values)});\n")

                        f.write("\n")

                logging.info(f"SQLAlchemy database backup created: {backup_file}")
                return backup_file

        except Exception as e:
            logging.error(f"SQLAlchemy backup failed: {e}")
            return None

    def backup_files(self):
        """Create a backup of uploaded files"""
        if not self.upload_folder.exists():
            logging.warning(f"Upload folder does not exist: {self.upload_folder}")
            return None

        try:
            timestamp = self.create_timestamp()
            backup_file = self.backup_dir / f"cryptee_files_{timestamp}.tar.gz"

            import tarfile

            with tarfile.open(backup_file, "w:gz") as tar:
                tar.add(self.upload_folder, arcname="uploads")

            logging.info(f"Files backup created: {backup_file}")
            return backup_file

        except Exception as e:
            logging.error(f"Files backup failed: {e}")
            return None

    def cleanup_old_backups(self):
        """Remove backups older than retention period"""
        try:
            cutoff_date = datetime.datetime.now() - datetime.timedelta(days=self.retention_days)

            for backup_file in self.backup_dir.glob("*"):
                if backup_file.is_file():
                    file_date = datetime.datetime.fromtimestamp(backup_file.stat().st_mtime)
                    if file_date < cutoff_date:
                        backup_file.unlink()
                        logging.info(f"Removed old backup: {backup_file}")

        except Exception as e:
            logging.error(f"Cleanup failed: {e}")

    def create_full_backup(self):
        """Create a complete backup of database and files"""
        logging.info("Starting full backup...")

        db_backup = self.backup_database()
        files_backup = self.backup_files()

        # Create a summary
        summary = {
            'timestamp': datetime.datetime.now().isoformat(),
            'database_backup': str(db_backup) if db_backup else None,
            'files_backup': str(files_backup) if files_backup else None,
            'status': 'success' if (db_backup or files_backup) else 'partial'
        }

        # Save summary
        summary_file = self.backup_dir / f"backup_summary_{self.create_timestamp()}.json"
        import json
        with open(summary_file, 'w') as f:
            json.dump(summary, f, indent=2)

        # Cleanup old backups
        self.cleanup_old_backups()

        logging.info("Backup completed")
        return summary

def main():
    """Main backup function"""
    backup = CrypteeBackup()
    summary = backup.create_full_backup()

    # Print summary
    print("\n=== Backup Summary ===")
    print(f"Timestamp: {summary['timestamp']}")
    print(f"Database: {summary['database_backup'] or 'Not backed up'}")
    print(f"Files: {summary['files_backup'] or 'Not backed up'}")
    print(f"Status: {summary['status']}")

if __name__ == '__main__':
    main()