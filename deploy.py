#!/usr/bin/env python3
"""
Cryptee Deployment Script
Handles full deployment of both backend and frontend components
"""

import os
import sys
import subprocess
import shutil
import json
from pathlib import Path

class CrypteeDeployer:
    def __init__(self, project_root):
        self.project_root = Path(project_root)
        self.backend_dir = self.project_root / "backend"
        self.frontend_dir = self.project_root / "frontend"
        self.static_dir = self.backend_dir / "app" / "static"

    def check_node_availability(self):
        """Check if Node.js and npm are available"""
        try:
            result = subprocess.run(['node', '--version'], capture_output=True, text=True)
            if result.returncode == 0:
                node_version = result.stdout.strip()
                print(f"✓ Node.js found: {node_version}")
            else:
                print("✗ Node.js not found")
                return False
        except FileNotFoundError:
            print("✗ Node.js not found")
            return False

        try:
            result = subprocess.run(['npm', '--version'], capture_output=True, text=True)
            if result.returncode == 0:
                npm_version = result.stdout.strip()
                print(f"✓ npm found: {npm_version}")
                return True
            else:
                print("✗ npm not found")
                return False
        except FileNotFoundError:
            print("✗ npm not found")
            return False

    def install_frontend_dependencies(self):
        """Install frontend dependencies"""
        if not self.frontend_dir.exists():
            print("✗ Frontend directory not found")
            return False

        print("Installing frontend dependencies...")
        try:
            result = subprocess.run(['npm', 'install'], cwd=self.frontend_dir, capture_output=True, text=True)
            if result.returncode == 0:
                print("✓ Frontend dependencies installed successfully")
                return True
            else:
                print(f"✗ Failed to install dependencies: {result.stderr}")
                return False
        except Exception as e:
            print(f"✗ Error installing dependencies: {e}")
            return False

    def build_frontend(self):
        """Build the React application"""
        print("Building React application...")
        try:
            result = subprocess.run(['npm', 'run', 'build'], cwd=self.frontend_dir, capture_output=True, text=True)
            if result.returncode == 0:
                print("✓ React application built successfully")
                return True
            else:
                print(f"✗ Failed to build React app: {result.stderr}")
                return False
        except Exception as e:
            print(f"✗ Error building React app: {e}")
            return False

    def deploy_frontend_to_flask(self):
        """Copy built React files to Flask static directory"""
        build_dir = self.frontend_dir / "build"
        if not build_dir.exists():
            print("✗ Build directory not found")
            return False

        print("Deploying React build to Flask static directory...")

        # Ensure static directory exists
        self.static_dir.mkdir(parents=True, exist_ok=True)

        try:
            # Copy all files from build to static
            for item in build_dir.iterdir():
                if item.is_file():
                    shutil.copy2(item, self.static_dir)
                elif item.is_dir():
                    dest_dir = self.static_dir / item.name
                    if dest_dir.exists():
                        shutil.rmtree(dest_dir)
                    shutil.copytree(item, dest_dir)

            print("✓ React build deployed to Flask static directory")
            return True
        except Exception as e:
            print(f"✗ Error deploying to Flask: {e}")
            return False

    def check_backend_health(self):
        """Check if backend is running and healthy"""
        import urllib.request
        try:
            with urllib.request.urlopen('http://127.0.0.1:5000/health') as response:
                data = json.loads(response.read().decode('utf-8'))
                if data.get('status') == 'healthy':
                    print("✓ Backend health check passed")
                    return True
                else:
                    print("✗ Backend health check failed")
                    return False
        except Exception as e:
            print(f"✗ Backend health check failed: {e}")
            return False

    def run_full_deployment(self):
        """Run complete deployment process"""
        print("Starting Cryptee Full Deployment")
        print("=" * 50)

        # Check Node.js availability
        if not self.check_node_availability():
            print("\n❌ Node.js/npm not available. Cannot proceed with frontend deployment.")
            print("Please install Node.js from https://nodejs.org/")
            print("Or run: winget install OpenJS.NodeJS.LTS")
            return False

        # Install frontend dependencies
        if not self.install_frontend_dependencies():
            return False

        # Build frontend
        if not self.build_frontend():
            return False

        # Deploy to Flask
        if not self.deploy_frontend_to_flask():
            return False

        # Check backend health
        if not self.check_backend_health():
            print("⚠️  Backend may not be running. Please start the backend with:")
            print("   python run.py")
            return False

        print("\nCryptee deployment completed successfully!")
        print("Frontend built and deployed")
        print("Backend running and healthy")
        print("Full-stack application ready")
        print("\nAccess your application at: http://127.0.0.1:5000")

        return True

def main():
    # Get project root directory
    script_dir = Path(__file__).parent
    project_root = script_dir

    deployer = CrypteeDeployer(project_root)
    success = deployer.run_full_deployment()

    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()