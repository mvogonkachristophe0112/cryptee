import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert, Modal, Form, Tab, Tabs } from 'react-bootstrap';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FaFileAlt, FaDownload, FaShareAlt, FaTrash, FaEye, FaHistory, FaInfoCircle, FaLock, FaCalendarAlt, FaUser, FaTag } from 'react-icons/fa';
import { filesAPI, formatFileSize, formatDate } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';

const FileDetails = () => {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [versions, setVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  useEffect(() => {
    loadFileDetails();
  }, [fileId]);

  const loadFileDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await filesAPI.getFile(fileId);
      setFile(response.data.file);
    } catch (err) {
      console.error('Failed to load file details:', err);
      setError('Failed to load file details. The file may not exist or you may not have access.');
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async () => {
    if (versions.length > 0) return; // Already loaded

    try {
      setLoadingVersions(true);
      const response = await filesAPI.listFileVersions(fileId);
      setVersions(response.data.versions);
    } catch (err) {
      console.error('Failed to load versions:', err);
      toast.error('Failed to load file versions');
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await filesAPI.downloadFile(file.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = file.original_filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('File downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const handleDelete = async () => {
    try {
      await filesAPI.deleteFile(file.id);
      toast.success('File deleted successfully!');
      navigate('/files');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete file');
      setShowDeleteModal(false);
    }
  };

  const handleShare = () => {
    navigate(`/share/${file.id}`);
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const iconMap = {
      pdf: '📄',
      doc: '📝', docx: '📝',
      xls: '📊', xlsx: '📊',
      ppt: '📽️', pptx: '📽️',
      jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️',
      mp4: '🎥', avi: '🎥', mov: '🎥',
      mp3: '🎵', wav: '🎵',
      zip: '📦', rar: '📦', '7z': '📦'
    };
    return iconMap[ext] || '📄';
  };

  if (loading) {
    return <LoadingSpinner message="Loading file details..." />;
  }

  if (error) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={6}>
            <Card className="text-center">
              <Card.Body className="py-5">
                <FaFileAlt size={64} className="text-muted mb-3" />
                <h4>File Not Found</h4>
                <p className="text-muted mb-4">{error}</p>
                <Button as={Link} to="/files" variant="primary">
                  Back to Files
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      {/* Header */}
      <div className="page-header">
        <h1>
          <FaFileAlt className="me-3" />
          File Details
        </h1>
        <p>View and manage your encrypted file</p>
      </div>

      <Row>
        <Col lg={8}>
          <Card className="mb-4">
            <Card.Header>
              <div className="d-flex align-items-center">
                <div style={{ fontSize: '2rem', marginRight: '1rem' }}>
                  {getFileIcon(file.original_filename)}
                </div>
                <div className="flex-grow-1">
                  <h4 className="mb-1">{file.original_filename}</h4>
                  <div className="d-flex gap-2 flex-wrap">
                    <Badge bg="success">
                      <FaLock className="me-1" />
                      Encrypted
                    </Badge>
                    <Badge bg="info">
                      {file.file_size ? formatFileSize(file.file_size) : 'Unknown size'}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card.Header>

            <Card.Body>
              <Tabs defaultActiveKey="details" className="mb-3">
                <Tab eventKey="details" title={<><FaInfoCircle className="me-1" />Details</>}>
                  <Row>
                    <Col md={6}>
                      <div className="mb-3">
                        <strong className="d-block text-muted mb-1">
                          <FaTag className="me-1" />
                          File Name
                        </strong>
                        <span>{file.original_filename}</span>
                      </div>
                      <div className="mb-3">
                        <strong className="d-block text-muted mb-1">
                          <FaFileAlt className="me-1" />
                          File Size
                        </strong>
                        <span>{file.file_size ? formatFileSize(file.file_size) : 'Unknown'}</span>
                      </div>
                      <div className="mb-3">
                        <strong className="d-block text-muted mb-1">
                          <FaCalendarAlt className="me-1" />
                          Upload Date
                        </strong>
                        <span>{formatDate(file.upload_date)}</span>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="mb-3">
                        <strong className="d-block text-muted mb-1">
                          <FaUser className="me-1" />
                          Owner
                        </strong>
                        <span>{file.owner?.email || 'You'}</span>
                      </div>
                      <div className="mb-3">
                        <strong className="d-block text-muted mb-1">
                          <FaLock className="me-1" />
                          Encryption Status
                        </strong>
                        <Badge bg="success">Encrypted</Badge>
                      </div>
                      <div className="mb-3">
                        <strong className="d-block text-muted mb-1">
                          <FaCalendarAlt className="me-1" />
                          Last Modified
                        </strong>
                        <span>{formatDate(file.updated_at || file.upload_date)}</span>
                      </div>
                    </Col>
                  </Row>
                </Tab>

                <Tab eventKey="versions" title={<><FaHistory className="me-1" />Versions</>} onEnter={loadVersions}>
                  <div className="text-center py-4">
                    <FaHistory size={48} className="text-muted mb-3" />
                    <h5>Version History</h5>
                    <p className="text-muted">File versioning is not yet implemented</p>
                  </div>
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Actions</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button variant="primary" size="lg" onClick={handleDownload}>
                  <FaDownload className="me-2" />
                  Download File
                </Button>

                <Button variant="success" size="lg" onClick={handleShare}>
                  <FaShareAlt className="me-2" />
                  Share File
                </Button>

                <Button
                  variant="outline-danger"
                  size="lg"
                  onClick={() => setShowDeleteModal(true)}
                >
                  <FaTrash className="me-2" />
                  Delete File
                </Button>
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <h5 className="mb-0">Quick Links</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button as={Link} to="/files" variant="outline-primary">
                  <FaFileAlt className="me-2" />
                  Back to Files
                </Button>
                <Button as={Link} to="/upload" variant="outline-success">
                  <FaFileAlt className="me-2" />
                  Upload More Files
                </Button>
                <Button as={Link} to="/shared" variant="outline-info">
                  <FaShareAlt className="me-2" />
                  Manage Shares
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete File</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete <strong>{file?.original_filename}</strong>?</p>
          <Alert variant="warning">
            <strong>Warning:</strong> This action cannot be undone. The file will be permanently deleted.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete File
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default FileDetails;