import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/TranslationContext';
import { Navbar as BootstrapNavbar, Nav, Button, Container } from 'react-bootstrap';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <BootstrapNavbar expand="lg" className="navbar-custom">
      <Container>
        <BootstrapNavbar.Brand as={Link} to="/" className="brand-logo">
          <i className="fas fa-shield-alt me-2"></i>
          Cryptee
        </BootstrapNavbar.Brand>

        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />

        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {isAuthenticated && (
              <>
                <Nav.Link as={Link} to="/dashboard">
                  <i className="fas fa-tachometer-alt me-1"></i>
                  {t('nav.dashboard', 'Dashboard')}
                </Nav.Link>
                <Nav.Link as={Link} to="/files">
                  <i className="fas fa-folder me-1"></i>
                  {t('nav.files', 'Files')}
                </Nav.Link>
                <Nav.Link as={Link} to="/shared">
                  <i className="fas fa-share-alt me-1"></i>
                  {t('nav.shared', 'Shared')}
                </Nav.Link>
                <Nav.Link as={Link} to="/upload">
                  <i className="fas fa-cloud-upload-alt me-1"></i>
                  {t('nav.upload', 'Upload')}
                </Nav.Link>
                <Nav.Link as={Link} to="/crypchat" className="crypchat-link">
                  <i className="fas fa-comments me-1"></i>
                  <strong>CrypChat</strong>
                </Nav.Link>
                <Nav.Link as={Link} to="/settings">
                  <i className="fas fa-cog me-1"></i>
                  {t('nav.settings', 'Settings')}
                </Nav.Link>
                <Nav.Link as={Link} to="/copyright">
                  <i className="fas fa-copyright me-1"></i>
                  {t('nav.copyright', 'Copyright')}
                </Nav.Link>
                <Nav.Link as={Link} to="/settings">
                  <i className="fas fa-cog me-1"></i>
                  Settings
                </Nav.Link>
              </>
            )}
          </Nav>

          <Nav className="ms-auto align-items-center">
            {isAuthenticated ? (
              <>
                <Nav.Item className="me-3">
                  <span className="text-white">
                    Welcome, {user?.first_name || user?.email?.split('@')[0]}
                  </span>
                </Nav.Item>
                <Nav.Link as={Link} to="/profile" className="me-2">
                  <i className="fas fa-user me-1"></i>
                  Profile
                </Nav.Link>
                <Nav.Link as={Link} to="/settings" className="me-2">
                  <i className="fas fa-cog me-1"></i>
                  Settings
                </Nav.Link>
                <Button
                  variant="outline-light"
                  size="sm"
                  onClick={handleLogout}
                  className="logout-btn"
                >
                  <i className="fas fa-sign-out-alt me-1"></i>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/login" className="me-2">
                  <i className="fas fa-sign-in-alt me-1"></i>
                  Login
                </Nav.Link>
                <Button
                  as={Link}
                  to="/register"
                  variant="primary"
                  size="sm"
                  className="register-btn"
                >
                  <i className="fas fa-user-plus me-1"></i>
                  Sign Up
                </Button>
              </>
            )}
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;