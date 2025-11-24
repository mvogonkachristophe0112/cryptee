import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Badge, ProgressBar, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
  FaShieldAlt,
  FaFileAlt,
  FaImage,
  FaVideo,
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaFilePowerpoint,
  FaFileArchive,
  FaFileCode,
  FaMusic,
  FaLock,
  FaUnlock,
  FaShareAlt,
  FaComments,
  FaCloudUploadAlt,
  FaDownload,
  FaEye,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaRocket,
  FaUsers,
  FaChartLine,
  FaMobileAlt,
  FaGlobe,
  FaStar
} from 'react-icons/fa';

const Home = () => {
  const [activeDemo, setActiveDemo] = useState('upload');

  const supportedFormats = [
    { icon: <FaImage />, name: 'Images', types: ['JPG', 'PNG', 'GIF', 'SVG', 'WEBP'], color: 'primary' },
    { icon: <FaFilePdf />, name: 'Documents', types: ['PDF', 'DOC', 'DOCX', 'TXT'], color: 'danger' },
    { icon: <FaFileExcel />, name: 'Spreadsheets', types: ['XLS', 'XLSX', 'CSV'], color: 'success' },
    { icon: <FaFilePowerpoint />, name: 'Presentations', types: ['PPT', 'PPTX'], color: 'warning' },
    { icon: <FaVideo />, name: 'Videos', types: ['MP4', 'AVI', 'MOV', 'WMV'], color: 'info' },
    { icon: <FaMusic />, name: 'Audio', types: ['MP3', 'WAV', 'FLAC', 'AAC'], color: 'secondary' },
    { icon: <FaFileArchive />, name: 'Archives', types: ['ZIP', 'RAR', '7Z', 'TAR'], color: 'dark' },
    { icon: <FaFileCode />, name: 'Code Files', types: ['JS', 'PY', 'HTML', 'CSS', 'JAVA'], color: 'primary' }
  ];

  const activityTimeline = [
    {
      time: '2 minutes ago',
      action: 'File uploaded',
      details: 'project_proposal.pdf (2.3 MB)',
      status: 'success',
      icon: <FaCloudUploadAlt />
    },
    {
      time: '5 minutes ago',
      action: 'File encrypted',
      details: 'financial_report.xlsx',
      status: 'success',
      icon: <FaLock />
    },
    {
      time: '10 minutes ago',
      action: 'Share link created',
      details: 'design_mockup.png (expires in 24h)',
      status: 'success',
      icon: <FaShareAlt />
    },
    {
      time: '15 minutes ago',
      action: 'File downloaded',
      details: 'presentation.pptx by john@example.com',
      status: 'info',
      icon: <FaDownload />
    },
    {
      time: '1 hour ago',
      action: 'Chat message sent',
      details: 'Secure conversation with team',
      status: 'primary',
      icon: <FaComments />
    }
  ];

  const features = [
    {
      icon: <FaShieldAlt size={40} />,
      title: 'Military-Grade Encryption',
      description: 'AES-256-GCM encryption ensures your files are completely secure. Zero-knowledge architecture means only you can access your data.',
      color: 'primary'
    },
    {
      icon: <FaLock size={40} />,
      title: 'Offline Encryption',
      description: 'Encrypt and decrypt files locally on your device. No internet connection required for maximum privacy and security.',
      color: 'success'
    },
    {
      icon: <FaShareAlt size={40} />,
      title: 'Secure File Sharing',
      description: 'Share files with time-limited, password-protected links. Full control over who can access your files and for how long.',
      color: 'info'
    },
    {
      icon: <FaComments size={40} />,
      title: 'End-to-End Encrypted Chat',
      description: 'Communicate securely with CrypChat. All messages are encrypted and can include file sharing within conversations.',
      color: 'warning'
    },
    {
      icon: <FaGlobe size={40} />,
      title: 'Multi-Format Support',
      description: 'Upload, encrypt, and share any file type. From documents to videos, Cryptee handles everything with enterprise security.',
      color: 'danger'
    },
    {
      icon: <FaChartLine size={40} />,
      title: 'Activity Tracking',
      description: 'Monitor all file activities, shares, and downloads. Complete audit trail for compliance and security oversight.',
      color: 'secondary'
    }
  ];

  return (
    <div className="home-page">
      {/* Hero Section */}
      <div className="hero-section bg-gradient text-white py-5">
        <Container>
          <Row className="align-items-center">
            <Col lg={6}>
              <h1 className="display-4 fw-bold mb-4">
                <FaShieldAlt className="me-3" />
                Welcome to Cryptee
              </h1>
              <p className="lead mb-4">
                The complete secure encrypted data sharing platform with military-grade security,
                offline encryption, and comprehensive activity tracking.
              </p>
              <div className="d-flex gap-3">
                <Button as={Link} to="/register" size="lg" variant="light" className="fw-bold">
                  <FaRocket className="me-2" />
                  Get Started Free
                </Button>
                <Button as={Link} to="/login" size="lg" variant="outline-light">
                  <FaUsers className="me-2" />
                  Sign In
                </Button>
              </div>
            </Col>
            <Col lg={6}>
              <div className="text-center">
                <div className="hero-icon mb-4">
                  <FaShieldAlt size={120} className="text-white opacity-75" />
                </div>
                <div className="d-flex justify-content-center gap-2 flex-wrap">
                  <Badge bg="success" className="p-2">
                    <FaLock className="me-1" />
                    AES-256 Encrypted
                  </Badge>
                  <Badge bg="info" className="p-2">
                    <FaGlobe className="me-1" />
                    Multi-Format Support
                  </Badge>
                  <Badge bg="warning" className="p-2">
                    <FaClock className="me-1" />
                    Activity Tracking
                  </Badge>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      <Container className="py-5">
        {/* Multi-Format Support Section */}
        <Row className="mb-5">
          <Col>
            <div className="text-center mb-5">
              <h2 className="display-5 fw-bold mb-3">
                <FaFileAlt className="me-3 text-primary" />
                Multi-Format File Support
              </h2>
              <p className="lead text-muted">
                Upload, encrypt, and share any file type with enterprise-grade security
              </p>
            </div>

            <Row>
              {supportedFormats.map((format, index) => (
                <Col md={3} sm={6} key={index} className="mb-4">
                  <Card className="h-100 border-0 shadow-sm hover-lift">
                    <Card.Body className="text-center">
                      <div className={`text-${format.color} mb-3`} style={{ fontSize: '2rem' }}>
                        {format.icon}
                      </div>
                      <h5 className="card-title">{format.name}</h5>
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
          </Col>
        </Row>

        {/* Activity Tracking Demo */}
        <Row className="mb-5">
          <Col lg={6}>
            <Card className="h-100 shadow">
              <Card.Header className="bg-primary text-white">
                <h4 className="mb-0">
                  <FaClock className="me-2" />
                  Real-Time Activity Tracking
                </h4>
              </Card.Header>
              <Card.Body>
                <p className="text-muted mb-4">
                  Monitor all file activities, shares, and downloads with complete audit trails
                </p>

                <div className="activity-timeline">
                  {activityTimeline.map((activity, index) => (
                    <div key={index} className="d-flex mb-3">
                      <div className={`activity-icon bg-${activity.status} text-white me-3`}>
                        {activity.icon}
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <strong>{activity.action}</strong>
                            <br />
                            <small className="text-muted">{activity.details}</small>
                          </div>
                          <small className="text-muted">{activity.time}</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={6}>
            <Card className="h-100 shadow">
              <Card.Header className="bg-success text-white">
                <h4 className="mb-0">
                  <FaRocket className="me-2" />
                  Live Demo
                </h4>
              </Card.Header>
              <Card.Body>
                <div className="demo-tabs mb-4">
                  <div className="d-flex gap-2 mb-3">
                    {['upload', 'encrypt', 'share', 'chat'].map((tab) => (
                      <Button
                        key={tab}
                        variant={activeDemo === tab ? 'primary' : 'outline-primary'}
                        size="sm"
                        onClick={() => setActiveDemo(tab)}
                        className="text-capitalize"
                      >
                        {tab}
                      </Button>
                    ))}
                  </div>

                  <div className="demo-content">
                    {activeDemo === 'upload' && (
                      <div className="text-center py-4">
                        <FaCloudUploadAlt size={48} className="text-primary mb-3" />
                        <h5>Drag & Drop Upload</h5>
                        <p className="text-muted">Upload any file type securely</p>
                        <ProgressBar now={75} className="mb-2" />
                        <small className="text-muted">Uploading project_proposal.pdf...</small>
                      </div>
                    )}

                    {activeDemo === 'encrypt' && (
                      <div className="text-center py-4">
                        <FaLock size={48} className="text-success mb-3" />
                        <h5>Offline Encryption</h5>
                        <p className="text-muted">AES-256 encryption on your device</p>
                        <div className="d-flex justify-content-center gap-2 mb-2">
                          <Badge bg="success">Processing</Badge>
                          <Badge bg="info">2/3 files</Badge>
                        </div>
                        <small className="text-muted">Encrypting financial_data.xlsx...</small>
                      </div>
                    )}

                    {activeDemo === 'share' && (
                      <div className="text-center py-4">
                        <FaShareAlt size={48} className="text-info mb-3" />
                        <h5>Secure Sharing</h5>
                        <p className="text-muted">Time-limited, password-protected links</p>
                        <Alert variant="success" className="py-2">
                          <small>Share link created: expires in 24 hours</small>
                        </Alert>
                      </div>
                    )}

                    {activeDemo === 'chat' && (
                      <div className="text-center py-4">
                        <FaComments size={48} className="text-warning mb-3" />
                        <h5>Encrypted Chat</h5>
                        <p className="text-muted">End-to-end encrypted messaging</p>
                        <div className="bg-light p-3 rounded text-start">
                          <small className="text-muted">You: Meeting at 3 PM? 📅</small>
                          <br />
                          <small className="text-primary">John: Perfect! See you then 👍</small>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Features Grid */}
        <Row className="mb-5">
          <Col>
            <div className="text-center mb-5">
              <h2 className="display-5 fw-bold mb-3">
                <FaStar className="me-3 text-warning" />
                Powerful Security Features
              </h2>
              <p className="lead text-muted">
                Everything you need for secure file management and communication
              </p>
            </div>

            <Row>
              {features.map((feature, index) => (
                <Col lg={4} md={6} key={index} className="mb-4">
                  <Card className="h-100 border-0 shadow-sm hover-lift">
                    <Card.Body className="text-center">
                      <div className={`text-${feature.color} mb-3`}>
                        {feature.icon}
                      </div>
                      <h5 className="card-title fw-bold">{feature.title}</h5>
                      <p className="card-text text-muted">{feature.description}</p>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </Col>
        </Row>

        {/* CTA Section */}
        <Row className="text-center">
          <Col>
            <Card className="border-0 shadow-lg bg-gradient text-white">
              <Card.Body className="py-5">
                <h3 className="display-5 fw-bold mb-3">Ready to Get Started?</h3>
                <p className="lead mb-4">
                  Join thousands of users who trust Cryptee for their secure file sharing needs
                </p>
                <div className="d-flex justify-content-center gap-3">
                  <Button as={Link} to="/register" size="lg" variant="light" className="fw-bold px-4">
                    <FaRocket className="me-2" />
                    Start Free Trial
                  </Button>
                  <Button as={Link} to="/login" size="lg" variant="outline-light" className="px-4">
                    <FaUsers className="me-2" />
                    Sign In to Account
                  </Button>
                </div>
                <div className="mt-4">
                  <small className="text-white-75">
                    <FaShieldAlt className="me-1" />
                    100% Secure • No Credit Card Required • Cancel Anytime
                  </small>
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
          min-height: 60vh;
          display: flex;
          align-items: center;
        }

        .bg-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .hover-lift {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .hover-lift:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.2) !important;
        }

        .activity-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .activity-timeline .activity-icon {
          width: 32px;
          height: 32px;
          font-size: 14px;
        }

        .demo-content {
          min-height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
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
        }
      `}</style>
    </div>
  );
};

export default Home;