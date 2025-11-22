import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Badge, Modal, Table } from 'react-bootstrap';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FaShareAlt, FaLink, FaCopy, FaTrash, FaEye, FaDownload, FaClock, FaLock, FaUnlock } from 'react-icons/fa';
import { sharesAPI, formatDate } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';

const ShareFile = () => {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [shareForm, setShareForm] = useState({
    password_protected: false,
    password: '',
    expires_in_days: 7,
    max_downloads: 0,
    allow_download: true
  });

  useEffect(() => {
    loadFileAndShares();
  }, [fileId]);

  const loadFileAndShares = async () => {
    try {
      setLoading(true);
      // Note: We would need to get file info and shares for this file
      // For now, we'll create a placeholder
      setFile({ id: fileId, name: `File ${fileId}`, size: 1024 * 1024 });
      setShares([]);
    } catch (error) {
      console.error('Failed to load file and shares:', error);
      toast.error('Failed to load file information');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShare = async (e) => {
    e.preventDefault();

    if (shareForm.password_protected && !shareForm.password) {
      toast.error('Password is required for password-protected shares');
      return;
    }

    try {
      setCreating(true);
      const shareData = {
        file_id: fileId,
        password: shareForm.password_protected ? shareForm.password : null,
        expires_in_days: shareForm.expires_in_days,
        max_downloads: shareForm.max_downloads || null,
        allow_download: shareForm.allow_download
      };

      const response = await sharesAPI.createShare(shareData);
      const newShare = response.data.share;

      setShares(prev => [newShare, ...prev]);
      setShowCreateModal(false);
      setShareForm({
        password_protected: false,
        password: '',
        expires_in_days: 7,
        max_downloads: 0,
        allow_download: true
      });

      toast.success('Share link created successfully!');
    } catch (error) {
      console.error('Failed to create share:', error);
      toast.error('Failed to create share link');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = async (shareLink) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/share/${shareLink}`);
      toast.success('Share link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleRevokeShare = async (shareId) => {
    if (!window.confirm('Are you sure you want to revoke this share?')) {
      return;
    }

    try {
      await sharesAPI.revokeShare(shareId);
      setShares(prev => prev.filter(share => share.id !== shareId));
      toast.success('Share revoked successfully!');
    } catch (error) {
      console.error('Failed to revoke share:', error);
      toast.error('Failed to revoke share');
    }
  };

  const getStatusBadge = (share) => {
    if (share.is_expired) {
      return <Badge bg="secondary">Expired</Badge>;
    }
    if (!share.is_active) {
      return <Badge bg="danger">Revoked</Badge>;
    }
    if (share.max_downloads && share.download_count >= share.max_downloads) {
      return <Badge bg="warning">Limit Reached</Badge>;
    }
    return <Badge bg="success">Active</Badge>;
  };

  if (loading) {
    return <LoadingSpinner message="Loading file sharing options..." />;
  }

  return (
    <Container className="py-4">
      {/* Header */}
      <div className="page-header">
        <h1>
          <FaShareAlt className="me-3" />
          Share File
        </h1>
        <p>Create and manage share links for your encrypted files</p>
      </div>

      <Row>
        <Col lg={8}>
          {/* File Info */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">File Information</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-flex align-items-center">
                <FaShareAlt size={32} className="text-primary me-3" />
                <div>
                  <h5 className="mb-1">{file?.name || 'Unknown File'}</h5>
                  <p className="text-muted mb-0">
                    Size: {file?.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown'}
                  </p>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Existing Shares */}
          <Card className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Active Shares</h5>
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                <FaShareAlt className="me-1" />
                Create New Share
              </Button>
            </Card.Header>
            <Card.Body>
              {shares.length === 0 ? (
                <div className="text-center py-4">
                  <FaShareAlt size={48} className="text-muted mb-3" />
                  <h5>No active shares</h5>
                  <p className="text-muted">Create your first share link to get started</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover>
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Expires</th>
                        <th>Downloads</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shares.map((share) => (
                        <tr key={share.id}>
                          <td>{getStatusBadge(share)}</td>
                          <td>{formatDate(share.created_at)}</td>
                          <td>
                            {share.expires_at ? formatDate(share.expires_at) : 'Never'}
                          </td>
                          <td>
                            {share.download_count || 0}
                            {share.max_downloads ? ` / ${share.max_downloads}` : ''}
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleCopyLink(share.share_link)}
                                title="Copy share link"
                              >
                                <FaCopy />
                              </Button>
                              {share.is_active && (
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleRevokeShare(share.id)}
                                  title="Revoke share"
                                >
                                  <FaTrash />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Quick Actions</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button as={Link} to={`/files/${fileId}`} variant="outline-primary">
                  <FaEye className="me-1" />
                  View File Details
                </Button>
                <Button as={Link} to="/files" variant="outline-secondary">
                  <FaShareAlt className="me-1" />
                  Back to Files
                </Button>
                <Button as={Link} to="/shared" variant="outline-info">
                  <FaShareAlt className="me-1" />
                  Manage All Shares
                </Button>
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <h5 className="mb-0">Security Tips</h5>
            </Card.Header>
            <Card.Body>
              <ul className="list-unstyled mb-0 small">
                <li className="mb-2">
                  <FaLock className="text-success me-2" />
                  Files are encrypted before sharing
                </li>
                <li className="mb-2">
                  <FaClock className="text-warning me-2" />
                  Set expiration dates for temporary shares
                </li>
                <li className="mb-0">
                  <FaUnlock className="text-info me-2" />
                  Use passwords for sensitive files
                </li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Create Share Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Create Share Link</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleCreateShare}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Expiration</Form.Label>
                  <Form.Select
                    value={shareForm.expires_in_days}
                    onChange={(e) => setShareForm(prev => ({
                      ...prev,
                      expires_in_days: parseInt(e.target.value)
                    }))}
                  >
                    <option value={1}>1 day</option>
                    <option value={7}>7 days</option>
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                    <option value={0}>Never expires</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Max Downloads (0 = unlimited)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={shareForm.max_downloads}
                    onChange={(e) => setShareForm(prev => ({
                      ...prev,
                      max_downloads: parseInt(e.target.value) || 0
                    }))}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Password protect this share"
                checked={shareForm.password_protected}
                onChange={(e) => setShareForm(prev => ({
                  ...prev,
                  password_protected: e.target.checked
                }))}
              />
            </Form.Group>

            {shareForm.password_protected && (
              <Form.Group className="mb-3">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  value={shareForm.password}
                  onChange={(e) => setShareForm(prev => ({
                    ...prev,
                    password: e.target.value
                  }))}
                  placeholder="Enter password"
                  required
                />
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Allow downloads"
                checked={shareForm.allow_download}
                onChange={(e) => setShareForm(prev => ({
                  ...prev,
                  allow_download: e.target.checked
                }))}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateShare}
            disabled={creating}
          >
            {creating ? 'Creating...' : 'Create Share Link'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ShareFile;