# Cryptee - Complete Secure Encrypted Data Sharing Platform

Copyright (c) 2025 MvogoNka Christophe Ulrich
All rights reserved.

This software is proprietary and confidential.
Unauthorized copying, modification, or distribution is strictly prohibited.

## 🚀 **Complete Feature Overview**

Cryptee is a comprehensive, production-ready secure encrypted data sharing platform with military-grade security, featuring end-to-end encryption, real-time messaging, multi-language support, and advanced threat protection.

### **🔐 Core Security Features**
- **End-to-End Encryption**: AES-256-GCM client-side encryption
- **Zero-Knowledge Architecture**: Server never sees plaintext data
- **Secure File Sharing**: Time-limited, password-protected links
- **JWT Authentication**: Multi-factor authentication support
- **Real-time Chat**: End-to-end encrypted messaging (CryChat)
- **Offline Storage**: Encrypted local storage (CryVault)
- **Offline Encryption**: Client-side file encryption/decryption
- **Self-Destruct Files**: Automatic file deletion features

### **🌐 Internationalization & UX**
- **Multi-Language Support**: English, French, Spanish, German
- **Dynamic Language Switching**: Real-time UI language changes
- **Theme System**: Light, Dark, and Auto themes
- **Responsive Design**: Mobile-first, cross-platform compatibility
- **Modern UI**: Bootstrap 5 with custom styling

### **🛡️ Advanced Security Features**
- **AI Threat Scanner**: Intelligent file analysis and malware detection
- **Geo-Fencing**: Location-based access controls
- **Decoy Login**: Hidden authentication system
- **Audit Logging**: Comprehensive security event tracking
- **Rate Limiting**: DDoS protection and abuse prevention
- **Session Security**: Advanced session monitoring

### **📱 Platform Support**
- **Web Application**: Full-featured React SPA with offline encryption
- **Mobile App**: React Native implementation
- **API-First Design**: Complete REST API
- **Docker Support**: Containerized deployment
- **Production Ready**: Nginx, systemd, monitoring included

## 🛠️ **Complete Technology Stack**

### **Backend Architecture**
- **Framework**: Python Flask 2.3+ with SQLAlchemy ORM
- **Database**: SQLite (development) / MySQL (production)
- **Authentication**: JWT with bcrypt hashing + optional 2FA
- **Encryption**: Web Crypto API (client) + Python cryptography
- **Real-time**: WebSocket support for chat and notifications
- **Caching**: Redis for sessions and rate limiting
- **Task Queue**: Celery for background processing

### **Frontend Architecture**
- **Framework**: React 18 with React Router 6
- **UI Library**: Bootstrap 5 + custom SCSS
- **State Management**: React Context + hooks
- **HTTP Client**: Axios with automatic token refresh
- **Notifications**: React Toastify
- **Icons**: React Icons + Font Awesome
- **Build Tool**: Create React App with custom webpack

### **Mobile Architecture**
- **Framework**: React Native with Expo
- **Navigation**: React Navigation
- **Storage**: AsyncStorage + encrypted local storage
- **Platform Support**: iOS + Android

### **DevOps & Deployment**
- **Containerization**: Docker + Docker Compose
- **Web Server**: Nginx with SSL/TLS
- **Process Manager**: systemd
- **Monitoring**: Health checks + logging
- **Backup**: Automated database and file backups
- **CI/CD**: GitHub Actions ready

## 🚀 **Quick Start Guide**

### **Prerequisites**
- **Python 3.8+** with pip package manager
- **Node.js 16+** (for frontend development)
- **Virtual environment** (recommended)
- **Git** for version control

### **Complete Installation**

#### **1. Clone and Setup**
```bash
git clone https://github.com/yourusername/cryptee.git
cd cryptee
```

#### **2. Backend Setup**
```bash
# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install Python dependencies
pip install -r requirements.txt
```

#### **3. Frontend Setup**
```bash
# Install Node.js dependencies
cd frontend
npm install

# Return to root directory
cd ..
```

#### **4. Environment Configuration**
```bash
# Copy environment template
cp .env.example .env

# Edit configuration (see Environment Variables section)
notepad .env  # Windows
# nano .env   # Linux/Mac
```

#### **5. Database Initialization**
```bash
# Initialize database
python run.py
# Database tables will be created automatically
```

#### **6. Start Development Servers**

**Option A: Manual Start**
```bash
# Terminal 1: Start Backend
python run.py

# Terminal 2: Start Frontend
cd frontend
start-frontend.bat  # Windows
# npm start         # Linux/Mac
```

**Option B: Production Start**
```bash
# Start all services with Docker
docker-compose -f docker-compose.yml up -d
```

#### **7. Access Application**
- **Web App**: http://localhost:3000 (frontend)
- **API**: http://localhost:5000 (backend)
- **Health Check**: http://localhost:5000/health

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Flask Configuration
FLASK_ENV=development
SECRET_KEY=your-secret-key-here

# Database
DATABASE_URL=sqlite:///cryptee.db

# JWT
JWT_SECRET_KEY=your-jwt-secret-key

# File Upload
MAX_FILE_SIZE=104857600  # 100MB
```

### Database Setup

For development (SQLite):
```bash
export DATABASE_URL=sqlite:///cryptee.db
```

For production (MySQL):
```bash
export DATABASE_URL=mysql+pymysql://user:password@localhost/cryptee
```

## 📡 **Complete API Documentation**

### **🔐 Authentication Endpoints**
```http
POST /api/auth/register     # User registration with encryption
POST /api/auth/login        # JWT login with bcrypt
POST /api/auth/logout       # Secure logout
GET  /api/auth/me          # Get current user profile
POST /api/auth/refresh      # Refresh JWT tokens
POST /api/auth/verify-email # Email verification
```

### **📁 File Management Endpoints**
```http
POST /api/files/upload           # Upload encrypted files
GET  /api/files                  # List user files with pagination
GET  /api/files/:id              # Get file details and metadata
DELETE /api/files/:id            # Delete file (soft delete)
POST /api/files/:id/restore      # Restore deleted file
DELETE /api/files/:id/permanent-delete # Permanent deletion

# File Versions
GET  /api/files/:id/versions     # List file versions
GET  /api/files/:id/versions/:vid # Get specific version
POST /api/files/:id/versions     # Create new version
DELETE /api/files/:id/versions/:vid # Delete version
```

### **🔗 Secure Sharing Endpoints**
```http
POST /api/shares                  # Create sharing link
GET  /api/shares                  # List user's shares
GET  /api/shares/:link            # Access shared file (public)
DELETE /api/shares/:id            # Revoke share
POST /api/shares/:id/extend       # Extend share expiration
GET  /api/shares/stats            # Get sharing statistics
```

### **💬 CryChat Endpoints**
```http
GET  /api/chat/conversations     # List user conversations
POST /api/chat/conversations     # Create new conversation
GET  /api/chat/conversations/:id # Get conversation with messages
POST /api/chat/messages          # Send encrypted message
DELETE /api/chat/messages/:id    # Delete message
GET  /api/chat/users/search      # Search users for chat
POST /api/chat/conversations/:id/read # Mark as read

# Chat Settings & Themes
GET  /api/chat/settings          # Get chat preferences
PUT  /api/chat/settings          # Update chat settings
GET  /api/chat/themes            # List custom themes
POST /api/chat/themes            # Create custom theme
PUT  /api/chat/themes/:id        # Update theme
DELETE /api/chat/themes/:id      # Delete theme
```

### **👤 User Management Endpoints**
```http
GET  /api/users/profile          # Get user profile
PUT  /api/users/profile          # Update profile
POST /api/users/change-password  # Change password
GET  /api/users/storage-info     # Get storage usage
GET  /api/users/activity         # Get user activity log

# Admin Endpoints (requires admin role)
GET  /api/users                  # List all users
PUT  /api/users/:id/status       # Update user status
DELETE /api/users/:id            # Delete user
```

### **⚙️ Settings & Configuration**
```http
GET  /api/settings               # Get user settings
POST /api/settings               # Save user settings
GET  /api/history                # Get activity history
POST /api/feedback               # Submit feedback
POST /api/bug-report             # Report bugs
POST /api/rate                   # Rate the application
```

### **🏥 System Endpoints**
```http
GET  /health                     # Health check
GET  /api/stats                  # System statistics
```

## 🔒 **Advanced Security Features**

### **🛡️ Encryption & Privacy**
- **AES-256-GCM End-to-End Encryption**: Files encrypted in browser before upload
- **Zero-Knowledge Architecture**: Server never sees plaintext data
- **PBKDF2 Key Derivation**: Secure key generation with high iteration counts
- **Web Crypto API**: Standards-compliant client-side cryptography
- **Perfect Forward Secrecy**: Each file uses unique encryption keys

### **🔐 Authentication & Access Control**
- **JWT with Refresh Tokens**: Secure session management
- **bcrypt Password Hashing**: Industry-standard password protection
- **Multi-Factor Authentication**: Optional 2FA support
- **Role-Based Access Control**: Granular permissions system
- **Session Security Monitoring**: Active session tracking and anomalies detection

### **🚨 Threat Protection**
- **AI-Powered Threat Scanner**: Intelligent malware and virus detection
- **Geo-Fencing**: Location-based access controls and restrictions
- **Decoy Authentication**: Hidden login system for additional security
- **Rate Limiting**: DDoS protection with Redis-backed limits
- **Input Validation & Sanitization**: Comprehensive security validation
- **Audit Logging**: Complete security event tracking and reporting

### **🔍 Monitoring & Compliance**
- **Real-time Security Monitoring**: Active threat detection
- **Comprehensive Audit Trails**: All actions logged with timestamps
- **Compliance Reporting**: GDPR and security standard compliance
- **Automated Alerts**: Security incident notifications
- **Backup Encryption**: All backups are encrypted and secure

## Development

### Project Structure

```
cryptee/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Flask app factory
│   │   ├── config/              # Configuration files
│   │   ├── models/              # Database models
│   │   ├── routes/              # API endpoints
│   │   └── utils/               # Utility functions
│   ├── tests/                   # Unit tests
│   ├── static/                  # Static files
│   └── uploads/                 # File uploads
├── frontend/
│   ├── css/                     # Stylesheets
│   ├── js/                      # JavaScript files
│   └── images/                  # Static images
├── docs/                        # Documentation
├── requirements.txt             # Python dependencies
├── run.py                       # Application entry point
└── README.md                    # This file
```

### Running Tests

```bash
pytest backend/tests/
```

### Code Quality

```bash
# Linting
flake8 backend/app/

# Type checking
mypy backend/app/

# Formatting
black backend/app/
```

## 🚀 **Deployment Guide**

### **💻 Development Environment**

#### **Quick Local Setup**
```bash
# 1. Install dependencies
pip install -r requirements.txt
cd frontend && npm install && cd ..

# 2. Configure environment
cp .env.example .env
# Edit .env with your local settings

# 3. Start development servers
python run.py                    # Backend on :5000
cd frontend && start-frontend.bat # Frontend on :3000
```

#### **VS Code Development**
- **Backend**: Use Python extension with virtual environment
- **Frontend**: Use React extension with ESLint
- **Database**: SQLite for development (auto-created)
- **Debugging**: Flask debugger enabled in development mode

### **🏭 Production Deployment**

#### **🐳 Docker Compose (Recommended)**
```bash
# Production environment setup
cp .env.production .env
nano .env  # Configure production settings

# Start production stack
docker-compose -f docker-compose.prod.yml up -d

# Check deployment health
curl http://your-domain.com/health
curl http://your-domain.com/api/stats
```

#### **🖥️ Manual Production Setup**
```bash
# 1. System dependencies
sudo apt update
sudo apt install python3 python3-pip mysql-server redis-server nginx certbot

# 2. Database setup
sudo mysql_secure_installation
mysql -u root -p
CREATE DATABASE cryptee;
CREATE USER 'cryptee'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON cryptee.* TO 'cryptee'@'localhost';

# 3. Application setup
pip install -r requirements.txt
cp .env.production .env
# Configure production settings

# 4. Services
sudo cp deploy/cryptee.service /etc/systemd/system/
sudo systemctl enable cryptee
sudo systemctl start cryptee

# 5. Web server
sudo cp nginx.conf /etc/nginx/sites-available/cryptee
sudo ln -s /etc/nginx/sites-available/cryptee /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 6. SSL Certificate
sudo certbot --nginx -d yourdomain.com
```

#### **☁️ Cloud Deployment Options**

**AWS/GCP/Azure:**
```bash
# Use provided Docker Compose for cloud deployment
# Configure environment variables for your cloud provider
# Set up load balancers and auto-scaling groups
```

**Heroku:**
```bash
# Use heroku.yml for Heroku deployment
git push heroku main
```

**VPS/Dedicated:**
```bash
# Use the manual setup guide above
# Configure firewall, monitoring, and backups
```

#### Manual Production Setup

1. **Install system dependencies:**
   ```bash
   sudo apt update
   sudo apt install python3 python3-pip mysql-server redis-server nginx
   ```

2. **Configure production environment:**
   ```bash
   cp .env.production .env
   # Edit with production values
   ```

3. **Set up database:**
   ```bash
   sudo mysql_secure_installation
   mysql -u root -p
   CREATE DATABASE cryptee;
   CREATE USER 'cryptee'@'localhost' IDENTIFIED BY 'your_secure_password';
   GRANT ALL PRIVILEGES ON cryptee.* TO 'cryptee'@'localhost';
   ```

4. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Initialize database:**
   ```bash
   flask db upgrade
   ```

6. **Set up systemd service:**
   ```bash
   sudo cp deploy/cryptee.service /etc/systemd/system/
   sudo systemctl enable cryptee
   sudo systemctl start cryptee
   ```

7. **Configure Nginx:**
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/cryptee
   sudo ln -s /etc/nginx/sites-available/cryptee /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### Backup and Recovery

**Automated Backups:**
```bash
# Run backup script
python backup.py

# Schedule daily backups (crontab)
0 2 * * * cd /path/to/cryptee && python backup.py
```

**Manual Backup:**
```bash
# Database
mysqldump -u cryptee -p cryptee > backup_$(date +%Y%m%d).sql

# Files
tar -czf files_backup_$(date +%Y%m%d).tar.gz backend/uploads/
```

### Monitoring and Health Checks

**Health Check Endpoint:**
```bash
curl http://yourdomain.com/health
```

**Log Monitoring:**
```bash
# View application logs
tail -f cryptee.log

# View systemd logs
sudo journalctl -u cryptee -f
```

### Production Checklist

- [x] Set strong SECRET_KEY and JWT_SECRET_KEY
- [x] Configure production database (MySQL)
- [x] Set up Redis for session storage and rate limiting
- [x] Configure HTTPS with SSL certificate
- [x] Set up monitoring and logging
- [x] Configure backup strategy
- [x] Set up CI/CD pipeline
- [x] Enable health checks
- [x] Configure rate limiting
- [x] Set up error handling and graceful shutdown
- [x] Configure firewall and security

## 🤝 **Contributing**

### **Development Workflow**
1. **Fork** the repository on GitHub
2. **Clone** your fork locally
3. **Create** a feature branch: `git checkout -b feature/your-feature`
4. **Make** your changes with proper testing
5. **Commit** with clear messages: `git commit -m "Add: feature description"`
6. **Push** to your fork: `git push origin feature/your-feature`
7. **Create** a Pull Request with detailed description

### **Code Standards**
- **Python**: PEP 8 with Black formatting
- **JavaScript**: ESLint with React rules
- **Security**: All code must pass security review
- **Testing**: 80%+ test coverage required
- **Documentation**: Update docs for all changes

### **Testing Requirements**
```bash
# Backend tests
pytest backend/tests/ -v --cov=backend/app

# Frontend tests
cd frontend && npm test -- --coverage

# Integration tests
python test_full_flow.py

# Security tests
python test_encryption.py
```

## 📜 **License & Legal**

**Copyright (c) 2025 MvogoNka Christophe Ulrich**
All rights reserved.

This software is proprietary and confidential.
Unauthorized copying, modification, or distribution is strictly prohibited.

See LICENSE.txt for full license terms and conditions.

## 🚨 **Security & Responsible Disclosure**

### **Reporting Security Vulnerabilities**
If you discover a security vulnerability, please report it responsibly:

- **Email**: security@cryptee.com
- **PGP Key**: Available on request
- **Response Time**: Within 48 hours
- **Bounty Program**: Available for critical vulnerabilities

**Do NOT create public issues for security vulnerabilities.**

### **Security Best Practices**
- Never commit secrets or keys to version control
- Use environment variables for configuration
- Keep dependencies updated
- Run security scans regularly
- Follow the principle of least privilege

## 🆘 **Support & Resources**

### **Documentation**
- **API Docs**: `/docs/api/` (when running)
- **User Guide**: `docs/user-guide.md`
- **Developer Guide**: `docs/developer-guide.md`
- **Deployment Guide**: `docs/deployment.md`

### **Community Support**
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and community help
- **Email Support**: support@cryptee.com
- **Documentation Wiki**: Comprehensive guides and tutorials

### **System Requirements**
- **Minimum**: Python 3.8+, Node.js 16+, 2GB RAM
- **Recommended**: Python 3.9+, Node.js 18+, 4GB RAM
- **Production**: Python 3.9+, Node.js 18+, 8GB+ RAM

---

## 🎯 **Final Project Summary**

**Cryptee** is now a complete, production-ready secure encrypted data sharing platform with:

- ✅ **Military-grade encryption** with zero-knowledge architecture
- ✅ **Real-time chat** (CryChat) with end-to-end encryption
- ✅ **Multi-language support** with dynamic switching
- ✅ **Theme system** (Light/Dark/Auto) with seamless transitions
- ✅ **Offline storage** (CryVault) for secure local access
- ✅ **Offline encryption** for client-side file processing
- ✅ **Advanced security features** including AI threat scanning
- ✅ **Mobile app** with React Native implementation
- ✅ **Docker deployment** with production configurations
- ✅ **Comprehensive monitoring** and health checks
- ✅ **Automated backups** and disaster recovery
- ✅ **Complete API documentation** and developer resources

**Ready for deployment and production use! 🚀**