import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert, Table, Form, InputGroup } from 'react-bootstrap';
import { FaShareAlt, FaSearch, FaDownload, FaTrash, FaEye, FaCopy, FaFilter } from 'react-icons/fa';
import { sharesAPI, formatDate } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';

const SharedFiles = () => {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const sharesPerPage = 15;

  useEffect(() => {
    loadShares();
  }, [currentPage, searchTerm, filterStatus]);

  const loadShares = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        per_page: sharesPerPage,
        search: searchTerm || undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined
      };

      const response = await sharesAPI.listShares(params);
      setShares(response.data.shares);
      setTotalPages(Math.ceil(response.data.pagination.total / sharesPerPage));
    } catch (err) {
      console.error('Failed to load shares:', err);
      setError('Failed to load shares. Please try again.');
    } finally {
      setLoading(false);
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
    if (!window.confirm('Are you sure you want to revoke this share? Recipients will no longer be able to access the file.')) {
      return;
    }

    try {
      await sharesAPI.revokeShare(shareId);
      setShares(prev => prev.map(share =>
        share.id === shareId ? { ...share, is_active: false } : share
      ));
      toast.success('Share revoked successfully!');
    } catch (error) {
      console.error('Failed to revoke share:', error);
      toast.error('Failed to revoke share');
    }
  };

  const handleExtendShare = async (shareId, days) => {
    try {
      await sharesAPI.extendShare(shareId, days);
      setShares(prev => prev.map(share =>
        share.id === shareId ? { ...share, expires_at: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() } : share
      ));
      toast.success(`Share extended by ${days} days!`);
    } catch (error) {
      console.error('Failed to extend share:', error);
      toast.error('Failed to extend share');
    }
  };

  const getStatusBadge = (share) => {
    if (!share.is_active) {
      return <Badge bg="danger">Revoked</Badge>;
    }
    if (share.is_expired) {
      return <Badge bg="secondary">Expired</Badge>;
    }
    if (share.max_downloads && share.download_count >= share.max_downloads) {
      return <Badge bg="warning">Limit Reached</Badge>;
    }
    return <Badge bg="success">Active</Badge>;
  };

  const filteredShares = shares.filter(share => {
    const matchesSearch = !searchTerm ||
      share.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      share.share_link?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'active' && share.is_active && !share.is_expired) ||
      (filterStatus === 'expired' && share.is_expired) ||
      (filterStatus === 'revoked' && !share.is_active);

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return <LoadingSpinner message="Loading shared files..." />;
  }

  return (
    <Container className="py-4">
      {/* Header */}
      <div className="page-header">
        <h1>
          <FaShareAlt className="me-3" />
          Shared Files
        </h1>
        <p>Manage all your file shares and sharing links</p>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
          <Button
            variant="outline-danger"
            size="sm"
            className="ms-3"
            onClick={loadShares}
          >
            Retry
          </Button>
        </Alert>
      )}

      {/* Search and Filter Bar */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <Row className="align-items-center">
                <Col md={6}>
                  <InputGroup>
                    <InputGroup.Text>
                      <FaSearch />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Search shares..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </InputGroup>
                </Col>
                <Col md={4}>
                  <Form.Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">All Shares</option>
                    <option value="active">Active Only</option>
                    <option value="expired">Expired</option>
                    <option value="revoked">Revoked</option>
                  </Form.Select>
                </Col>
                <Col md={2} className="text-end">
                  <Button variant="outline-primary" onClick={loadShares}>
                    <FaFilter className="me-1" />
                    Refresh
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Shares Table */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Your Shares ({filteredShares.length})</h5>
            </Card.Header>
            <Card.Body className="p-0">
              {filteredShares.length === 0 ? (
                <div className="text-center py-5">
                  <FaShareAlt size={64} className="text-muted mb-3" />
                  <h4>No shares found</h4>
                  <p className="text-muted mb-4">
                    {searchTerm || filterStatus !== 'all'
                      ? 'Try adjusting your search or filter criteria.'
                      : 'You haven\'t shared any files yet.'}
                  </p>
                  <Button variant="primary" href="/files">
                    Share Your First File
                  </Button>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>File</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Expires</th>
                        <th>Downloads</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredShares.map((share) => (
                        <tr key={share.id}>
                          <td>
                            <div>
                              <div className="fw-bold">{share.file_name || `File ${share.id}`}</div>
                              <small className="text-muted">
                                Link: {share.share_link}
                              </small>
                            </div>
                          </td>
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
                              {share.is_active && !share.is_expired && (
                                <>
                                  <Button
                                    variant="outline-success"
                                    size="sm"
                                    onClick={() => handleExtendShare(share.id, 7)}
                                    title="Extend by 7 days"
                                  >
                                    <FaShareAlt />
                                  </Button>
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => handleRevokeShare(share.id)}
                                    title="Revoke share"
                                  >
                                    <FaTrash />
                                  </Button>
                                </>
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
      </Row>

      {/* Statistics Card */}
      {shares.length > 0 && (
        <Row className="mt-4">
          <Col>
            <Card>
              <Card.Header>
                <h5 className="mb-0">Share Statistics</h5>
              </Card.Header>
              <Card.Body>
                <Row className="text-center">
                  <Col md={3}>
                    <div className="stat-number">{shares.length}</div>
                    <div className="stat-label">Total Shares</div>
                  </Col>
                  <Col md={3}>
                    <div className="stat-number text-success">
                      {shares.filter(s => s.is_active && !s.is_expired).length}
                    </div>
                    <div className="stat-label">Active</div>
                  </Col>
                  <Col md={3}>
                    <div className="stat-number text-warning">
                      {shares.filter(s => s.is_expired).length}
                    </div>
                    <div className="stat-label">Expired</div>
                  </Col>
                  <Col md={3}>
                    <div className="stat-number text-danger">
                      {shares.filter(s => !s.is_active).length}
                    </div>
                    <div className="stat-label">Revoked</div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default SharedFiles;