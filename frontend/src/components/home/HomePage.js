import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert, ProgressBar } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
  FaShieldAlt,
  FaLock,
  FaShareAlt,
  FaComments,
  FaGlobe,
  FaChartLine,
  FaRocket,
  FaUsers,
  FaFileAlt,
  FaCloudUploadAlt,
  FaEye,
  FaStar,
  FaCheckCircle,
  FaMobileAlt,
  FaServer,
  FaWifi,
  FaDatabase,
  FaVideo,
  FaImage,
  FaMusic,
  FaCode,
  FaArchive,
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaClock,
  FaBatteryFull,
  FaFingerprint,
  FaKey,
  FaSync
} from 'react-icons/fa';

const HomePage = () => {
  const [activeFeature, setActiveFeature] = useState('encryption');

  const features = [
    {
      id: 'encryption',
      icon: <FaLock size={50} />,
      title: 'Military-Grade Encryption',
      description: 'AES-256-GCM encryption ensures your files are completely secure with zero-knowledge architecture.',
      color: 'primary',
      details: [
        'Client-side encryption',
        'Zero-knowledge design',
        'Perfect forward secrecy',
        'Military-grade security'
      ]
    },
    {
      id: 'offline',
      icon: <FaBatteryFull size={50} />,
      title: 'Offline Encryption',
      description: 'Encrypt and decrypt files locally on your device. No internet connection required.',
      color: 'success',
      details: [
        'Works offline',
        'Client-side processing',
        'No data transmission',
        'Instant encryption'
      ]
    },
    {
      id: 'sharing',
      icon: <FaShareAlt size={50} />,
      title: 'Secure File Sharing',
      description: 'Share files with time-limited, password-protected links and full access control.',
      color: 'info',
      details: [
        'Time-limited links',
        'Password protection',
        'Download tracking',
        'Access revocation'
      ]
    },
    {
      id: 'chat',
      icon: <FaComments size={50} />,
      title: 'Encrypted Chat',
      description: 'Communicate securely with end-to-end encrypted messaging and file sharing.',
      color: 'warning',
      details: [
        'End-to-end encryption',
        'File sharing in chat',
        'Real-time messaging',
        'Secure conversations'
      ]
    },
    {
      id: 'multiformat',
      icon: <FaGlobe size={50} />,
      title: 'Multi-Format Support',
      description: 'Upload, encrypt, and share any file type with comprehensive format support.',
      color: 'danger',
      details: [
        '25+ file formats',
        'All file types supported',
        'Format preservation',
        'Universal compatibility'
      ]
    },
    {
      id: 'analytics',
      icon: <FaChartLine size={50} />,
      title: 'Activity Analytics',
      description: 'Monitor all file activities, shares, and downloads with complete audit trails.',
      color: 'secondary',
      details: [
        'Activity timeline',
        'Usage statistics',
        'File type analytics',
        'Security monitoring'
      ]
    }
  ];

  const fileFormats = [
    { icon: <FaImage />, name: 'Images', types: ['JPG', 'PNG', 'GIF', 'SVG'], color: 'primary' },
    { icon: <FaFilePdf />, name: 'Documents', types: ['PDF', 'DOC', 'TXT'], color: 'danger' },
    { icon: <FaFileExcel />, name: 'Spreadsheets', types: ['XLS', 'CSV'], color: 'success' },
    { icon: <FaVideo />, name: 'Videos', types: ['MP4', 'AVI'], color: 'info' },
    { icon: <FaMusic />, name: 'Audio', types: ['MP3', 'WAV'], color: 'warning' },
    { icon: <FaCode />, name: 'Code', types: ['JS', 'PY', 'HTML'], color: 'secondary' }
  ];

  const securityFeatures = [
    {
      icon: <FaFingerprint />,
      title: 'Biometric Authentication',
      description: 'Optional fingerprint and face recognition for enhanced security'
    },
    {
      icon: <FaKey />,
      title: 'Hardware Security Keys',
      description: 'Support for FIDO2 security keys and hardware tokens'
    },
    {
      icon: <FaSync />,
      title: 'Auto-Sync & Backup',
      description: 'Automatic encrypted backups across all your devices'
    },
    {
      icon: <FaServer />,
      title: 'Self-Hosted Option',
      description: 'Deploy your own Cryptee server for maximum privacy control'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Security Analyst',
      content: 'Cryptee has revolutionized how we handle sensitive documents. The offline encryption is a game-changer.',
      rating: 5
    },
    {
      name: 'Marcus Rodriguez',
      role: 'IT Director',
      content: 'The multi-format support and activity tracking give us complete visibility and control over our data.',
      rating: 5
    },
    {
      name: 'Dr. Emily Watson',
      role: 'Research Scientist',
      content: 'Perfect for academic research. The encryption is military-grade and the interface is intuitive.',
      rating: 5
    }
  ];

  return (
    <div className="home-page">
      {/* Hero Section */}
      <div className="hero-section bg-gradient text-white py-5">
        <Container>
          <Row className="align-items-center min-vh-75">
            <Col lg={6}>
              <div className="hero-content">
                <h1 className="display-4 fw-bold mb-4">
                  <FaShieldAlt className="me-3 text-warning" />
                  Secure File Sharing
                  <br />
                  <span className="text-warning">Reimagined</span>
                </h1>
                <p className="lead mb-4 opacity-90">
                  Experience the future of secure file sharing with military-grade encryption,
                  offline capabilities, and comprehensive activity tracking.
                </p>
                <div className="d-flex gap-3 mb-4">
                  <Button as={Link} to="/register" size="lg" variant="warning" className="fw-bold px-4 shadow">
                    <FaRocket className="me-2" />
                    Start Free Trial
                  </Button>
                  <Button as={Link} to="/login" size="lg" variant="outline-light" className="px-4">
                    <FaUsers className="me-2" />
                    Sign In
                  </Button>
                </div>
                <div className="d-flex align-items-center gap-4 text-small">
                  <div className="d-flex align-items-center">
                    <FaCheckCircle className="me-2 text-success" />
                    <span>No credit card required</span>
                  </div>
                  <div className="d-flex align-items-center">
                    <FaCheckCircle className="me-2 text-success" />
                    <span>Free forever plan</span>
                  </div>
                  <div className="d-flex align-items-center">
                    <FaCheckCircle className="me-2 text-success" />
                    <span>Cancel anytime</span>
                  </div>
                </div>
              </div>
            </Col>
            <Col lg={6}>
              <div className="hero-visual text-center">
                <div className="hero-icon-container mb-4">
                  <div className="hero-main-icon">
                    <FaShieldAlt size={120} className="text-white opacity-90" />
                  </div>
                  <div className="floating-elements">
                    <div className="floating-icon floating-1">
                      <FaLock size={24} />
                    </div>
                    <div className="floating-icon floating-2">
                      <FaFileAlt size={24} />
                    </div>
                    <div className="floating-icon floating-3">
                      <FaShareAlt size={24} />
                    </div>
                    <div className="floating-icon floating-4">
                      <FaComments size={24} />
                    </div>
                  </div>
                </div>
                <div className="d-flex justify-content-center gap-2 flex-wrap">
                  <Badge bg="success" className="p-2 fs-6">
                    <FaLock className="me-1" />
                    AES-256 Encrypted
                  </Badge>
                  <Badge bg="info" className="p-2 fs-6">
                    <FaGlobe className="me-1" />
                    Multi-Format Support
                  </Badge>
                  <Badge bg="warning" className="p-2 fs-6">
                    <FaClock className="me-1" />
                    Activity Tracking
                  </Badge>
                  <Badge bg="primary" className="p-2 fs-6">
                    <FaWifi className="me-1" />
                    Offline Capable
                  </Badge>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      <Container className="py-5">
        {/* Features Showcase */}
        <Row className="mb-5">
          <Col>
            <div className="text-center mb-5">
              <h2 className="display-5 fw-bold mb-3">
                Powerful Security Features
              </h2>
              <p className="lead text-muted mb-4">
                Everything you need for secure file management and communication
              </p>
            </div>

            <Row className="g-4">
              {features.map((feature) => (
                <Col lg={4} md={6} key={feature.id}>
                  <Card
                    className={`feature-card h-100 border-0 shadow-sm hover-lift ${
                      activeFeature === feature.id ? 'active' : ''
                    }`}
                    onClick={() => setActiveFeature(feature.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Card.Body className="text-center p-4">
                      <div className={`text-${feature.color} mb-3 feature-icon`}>
                        {feature.icon}
                      </div>
                      <h5 className="card-title fw-bold mb-3">{feature.title}</h5>
                      <p className="card-text text-muted mb-3">{feature.description}</p>

                      {activeFeature === feature.id && (
                        <div className="feature-details mt-3 pt-3 border-top">
                          <ul className="list-unstyled text-start">
                            {feature.details.map((detail, index) => (
                              <li key={index} className="mb-2">
                                <FaCheckCircle className={`me-2 text-${feature.color}`} />
                                {detail}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </Col>
        </Row>

        {/* File Format Support */}
        <Row className="mb-5">
          <Col>
            <div className="text-center mb-5">
              <h2 className="display-5 fw-bold mb-3">
                <FaFileAlt className="me-3 text-primary" />
                Universal File Support
              </h2>
              <p className="lead text-muted">
                Upload, encrypt, and share any file type with enterprise-grade security
              </p>
            </div>

            <Row className="g-3">
              {fileFormats.map((format, index) => (
                <Col md={4} sm={6} key={index} className="mb-3">
                  <Card className="format-card h-100 border-0 shadow-sm">
                    <Card.Body className="text-center p-3">
                      <div className={`text-${format.color} mb-2`} style={{ fontSize: '2rem' }}>
                        {format.icon}
                      </div>
                      <h6 className="mb-2">{format.name}</h6>
                      <div className="d-flex flex-wrap justify-content-center gap-1">
                        {format.types.map((type, i) => (
                          <Badge key={i} bg={format.color} className="small">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>

            <div className="text-center mt-4">
              <Alert variant="info" className="d-inline-block">
                <FaGlobe className="me-2" />
                <strong>25+ file formats supported</strong> - from documents to videos, we handle everything
              </Alert>
            </div>
          </Col>
        </Row>

        {/* New Features: Security Enhancements & Testimonials */}
        <Row className="mb-5">
          <Col lg={8} className="mb-4">
            <Card className="shadow">
              <Card.Header className="bg-primary text-white">
                <h4 className="mb-0">
                  <FaFingerprint className="me-2" />
                  Advanced Security Features
                </h4>
              </Card.Header>
              <Card.Body>
                <Row>
                  {securityFeatures.map((feature, index) => (
                    <Col md={6} key={index} className="mb-4">
                      <div className="d-flex align-items-start">
                        <div className="text-primary me-3 mt-1">
                          {feature.icon}
                        </div>
                        <div>
                          <h6 className="fw-bold mb-2">{feature.title}</h6>
                          <p className="text-muted small mb-0">{feature.description}</p>
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4} className="mb-4">
            <Card className="shadow h-100">
              <Card.Header className="bg-success text-white">
                <h4 className="mb-0">
                  <FaStar className="me-2" />
                  What Users Say
                </h4>
              </Card.Header>
              <Card.Body>
                {testimonials.map((testimonial, index) => (
                  <div key={index} className={`mb-4 ${index < testimonials.length - 1 ? 'border-bottom pb-3' : ''}`}>
                    <div className="d-flex mb-2">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <FaStar key={i} className="text-warning me-1" size={12} />
                      ))}
                    </div>
                    <p className="small mb-2">"{testimonial.content}"</p>
                    <div className="text-end">
                      <small className="fw-bold">{testimonial.name}</small>
                      <br />
                      <small className="text-muted">{testimonial.role}</small>
                    </div>
                  </div>
                ))}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Live Demo Section */}
        <Row className="mb-5">
          <Col>
            <Card className="shadow">
              <Card.Header className="bg-warning text-dark">
                <h4 className="mb-0">
                  <FaRocket className="me-2" />
                  Live Demo - See Cryptee in Action
                </h4>
              </Card.Header>
              <Card.Body>
                <Row className="align-items-center">
                  <Col lg={6}>
                    <h5 className="mb-3">Experience Real-Time Encryption</h5>
                    <p className="text-muted mb-4">
                      Watch as your files are encrypted using military-grade AES-256 encryption,
                      right in your browser with zero server access to your data.
                    </p>
                    <div className="demo-progress mb-3">
                      <div className="d-flex justify-content-between mb-2">
                        <span>Encrypting project_files.zip</span>
                        <span>87%</span>
                      </div>
                      <ProgressBar now={87} variant="success" className="mb-2" />
                      <small className="text-muted">Processing 2.3 MB • AES-256-GCM encryption</small>
                    </div>
                    <Button variant="primary" size="sm">
                      <FaEye className="me-2" />
                      View Live Demo
                    </Button>
                  </Col>
                  <Col lg={6}>
                    <div className="demo-visual text-center">
                      <div className="demo-icon mb-3">
                        <FaLock size={80} className="text-primary" />
                      </div>
                      <div className="encryption-animation">
                        <div className="file-icon mb-2">
                          <FaFileAlt size={40} className="text-muted" />
                        </div>
                        <div className="encryption-process">
                          <FaSync className="text-success spinning" size={24} />
                          <small className="text-success ms-2">Encrypting...</small>
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Final CTA */}
        <Row>
          <Col>
            <Card className="border-0 shadow-lg bg-gradient text-white">
              <Card.Body className="py-5 text-center">
                <h3 className="display-4 fw-bold mb-3">Ready to Secure Your Files?</h3>
                <p className="lead mb-4 opacity-90">
                  Join thousands of users who trust Cryptee for their most sensitive data.
                  Start your free trial today - no credit card required.
                </p>
                <div className="d-flex justify-content-center gap-3 mb-4">
                  <Button as={Link} to="/register" size="lg" variant="light" className="fw-bold px-4 shadow">
                    <FaRocket className="me-2" />
                    Get Started Free
                  </Button>
                  <Button as={Link} to="/login" size="lg" variant="outline-light" className="px-4">
                    <FaUsers className="me-2" />
                    Sign In to Account
                  </Button>
                </div>
                <div className="row text-center">
                  <div className="col-md-3 mb-3">
                    <div className="d-flex align-items-center justify-content-center">
                      <FaShieldAlt className="me-2 text-warning" size={20} />
                      <span className="small">Military-Grade Security</span>
                    </div>
                  </div>
                  <div className="col-md-3 mb-3">
                    <div className="d-flex align-items-center justify-content-center">
                      <FaGlobe className="me-2 text-info" size={20} />
                      <span className="small">Multi-Platform Support</span>
                    </div>
                  </div>
                  <div className="col-md-3 mb-3">
                    <div className="d-flex align-items-center justify-content-center">
                      <FaClock className="me-2 text-success" size={20} />
                      <span className="small">24/7 Activity Monitoring</span>
                    </div>
                  </div>
                  <div className="col-md-3 mb-3">
                    <div className="d-flex align-items-center justify-content-center">
                      <FaMobileAlt className="me-2 text-primary" size={20} />
                      <span className="small">Mobile & Desktop Apps</span>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      <style jsx>{`
        .home-page {
          min-height: 100vh;
        }

        .hero-section {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          position: relative;
          overflow: hidden;
        }

        .hero-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
          opacity: 0.1;
        }

        .min-vh-75 {
          min-height: 75vh;
        }

        .hero-content {
          position: relative;
          z-index: 2;
        }

        .hero-visual {
          position: relative;
          z-index: 2;
        }

        .hero-icon-container {
          position: relative;
          display: inline-block;
        }

        .hero-main-icon {
          filter: drop-shadow(0 10px 30px rgba(0,0,0,0.3));
        }

        .floating-elements {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .floating-icon {
          position: absolute;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 50%;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          animation: float 6s ease-in-out infinite;
        }

        .floating-1 {
          top: -10px;
          right: -10px;
          animation-delay: 0s;
        }

        .floating-2 {
          bottom: -10px;
          right: 20px;
          animation-delay: 2s;
        }

        .floating-3 {
          top: 20px;
          left: -10px;
          animation-delay: 4s;
        }

        .floating-4 {
          bottom: 20px;
          left: -10px;
          animation-delay: 1s;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        .feature-card {
          transition: all 0.3s ease;
          border: 2px solid transparent !important;
        }

        .feature-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(0,0,0,0.1) !important;
        }

        .feature-card.active {
          border-color: var(--bs-primary) !important;
          box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25) !important;
        }

        .feature-icon {
          transition: transform 0.3s ease;
        }

        .feature-card:hover .feature-icon {
          transform: scale(1.1);
        }

        .format-card {
          transition: all 0.3s ease;
        }

        .format-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.1) !important;
        }

        .bg-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        }

        .demo-visual {
          position: relative;
        }

        .encryption-animation {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem;
          background: rgba(255,255,255,0.1);
          border-radius: 15px;
          backdrop-filter: blur(10px);
        }

        .spinning {
          animation: spin 2s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .text-small {
          font-size: 0.875rem;
        }

        @media (max-width: 768px) {
          .hero-section {
            text-align: center;
            padding: 3rem 0;
          }

          .display-4 {
            font-size: 2.5rem;
          }

          .display-5 {
            font-size: 2rem;
          }

          .floating-icon {
            width: 40px;
            height: 40px;
            font-size: 14px;
          }

          .hero-main-icon svg {
            width: 80px !important;
            height: 80px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default HomePage;