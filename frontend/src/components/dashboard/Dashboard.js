import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { filesAPI, usersAPI, sharesAPI, formatFileSize, formatDate } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import {
  FaFileAlt,
  FaShareAlt,
  FaCloudUploadAlt,
  FaDownload,
  FaUsers,
  FaShieldAlt,
  FaClock,
  FaExclamationTriangle
} from 'react-icons/fa';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    files: { count: 0, totalSize: 0 },
    shares: { count: 0, active: 0 },
    storage: { used: 0, limit: 100 * 1024 * 1024, percentage: 0 }
  });
  const [recentFiles, setRecentFiles] = useState([]);
  const [recentShares, setRecentShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load files
      const filesResponse = await filesAPI.listFiles({ page: 1, per_page: 5 });
      setRecentFiles(filesResponse.data.files);

      // Load shares
      const sharesResponse = await sharesAPI.listShares({ page: 1, per_page: 5 });
      setRecentShares(sharesResponse.data.shares);

      // Load storage info
      const storageResponse = await usersAPI.getStorageInfo();
      const storageData = storageResponse.data.storage;

      // Load share stats
      const shareStatsResponse = await sharesAPI.getShareStats();
      const shareStats = shareStatsResponse.data.stats;

      setStats({
        files: {
          count: filesResponse.data.pagination.total,
          totalSize: storageData.used_bytes
        },
        shares: {
          count: shareStats.total_shares,
          active: shareStats.active_shares
        },
        storage: {
          used: storageData.used_bytes,
          limit: storageData.limit_bytes,
          percentage: storageData.percentage_used
        }
      });

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subtitle, icon, variant = 'primary', link }) => (
    <Card className={`stat-card ${variant} h-100`}>
      <Card.Body className="d-flex align-items-center">
        <div className="flex-grow-1">
          <h3 className="mb-1">{value}</h3>
          <p className="mb-0 text-white-75">{title}</p>
          {subtitle && <small className="text-white-50">{subtitle}</small>}
        </div>
        <div className="ms-3">
          {icon}
        </div>
      </Card.Body>
      {link && (
        <Card.Footer className="bg-transparent border-0 p-2">
          <Button as={Link} to={link} variant="link" className="text-white p-0">
            View Details →
          </Button>
        </Card.Footer>
      )}
    </Card>
  );

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  return (
    <Container className="py-4">
      {/* Welcome Header */}
      <div className="page-header">
        <h1>
          <FaShieldAlt className="me-3" />
          Welcome back, {user?.first_name || user?.email?.split('@')[0]}!
        </h1>
        <p>Manage your secure files and shares from your dashboard</p>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4">
          <FaExclamationTriangle className="me-2" />
          {error}
          <Button
            variant="outline-danger"
            size="sm"
            className="ms-3"
            onClick={loadDashboardData}
          >
            Retry
          </Button>
        </Alert>
      )}

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={3} sm={6} className="mb-3">
          <StatCard
            title="Total Files"
            value={stats.files.count}
            subtitle={`${formatFileSize(stats.files.totalSize)} used`}
            icon={<FaFileAlt size={30} />}
            link="/files"
          />
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <StatCard
            title="Active Shares"
            value={stats.shares.active}
            subtitle={`${stats.shares.count} total shares`}
            icon={<FaShareAlt size={30} />}
            variant="success"
            link="/shared"
          />
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <StatCard
            title="Storage Used"
            value={`${stats.storage.percentage.toFixed(1)}%`}
            subtitle={`${formatFileSize(stats.storage.used)} / ${formatFileSize(stats.storage.limit)}`}
            icon={<FaDownload size={30} />}
            variant={stats.storage.percentage > 90 ? 'danger' : stats.storage.percentage > 75 ? 'warning' : 'info'}
          />
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <StatCard
            title="Quick Actions"
            value=""
            subtitle="Upload or share files"
            icon={<FaCloudUploadAlt size={30} />}
            variant="secondary"
          />
        </Col>
      </Row>

      {/* Quick Actions */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <FaCloudUploadAlt className="me-2" />
                Quick Actions
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="d-flex flex-wrap gap-2">
                <Button as={Link} to="/upload" variant="primary" size="sm">
                  <FaCloudUploadAlt className="me-1" />
                  Upload Files
                </Button>
                <Button as={Link} to="/files" variant="outline-primary" size="sm">
                  <FaFileAlt className="me-1" />
                  Browse Files
                </Button>
                <Button as={Link} to="/shared" variant="outline-success" size="sm">
                  <FaShareAlt className="me-1" />
                  Manage Shares
                </Button>
                <Button as={Link} to="/profile" variant="outline-info" size="sm">
                  <FaUsers className="me-1" />
                  Profile Settings
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Activity */}
      <Row>
        <Col lg={6} className="mb-4">
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">
                <FaFileAlt className="me-2" />
                Recent Files
              </h5>
            </Card.Header>
            <Card.Body>
              {recentFiles.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <FaFileAlt size={48} className="mb-3 opacity-50" />
                  <p>No files uploaded yet</p>
                  <Button as={Link} to="/upload" variant="primary" size="sm">
                    Upload Your First File
                  </Button>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {recentFiles.slice(0, 5).map((file) => (
                    <div key={file.id} className="list-group-item px-0">
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="flex-grow-1">
                          <h6 className="mb-1">
                            <Link to={`/files/${file.id}`} className="text-decoration-none">
                              {file.original_filename}
                            </Link>
                            {file.is_encrypted && (
                              <Badge bg="success" className="ms-2">
                                <FaShieldAlt className="me-1" />
                                Encrypted
                              </Badge>
                            )}
                          </h6>
                          <small className="text-muted">
                            {formatFileSize(file.file_size)} • {formatDate(file.upload_date)}
                          </small>
                        </div>
                        <Button as={Link} to={`/files/${file.id}`} variant="outline-primary" size="sm">
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
            {recentFiles.length > 0 && (
              <Card.Footer className="bg-transparent">
                <Button as={Link} to="/files" variant="link" className="p-0">
                  View All Files →
                </Button>
              </Card.Footer>
            )}
          </Card>
        </Col>

        <Col lg={6} className="mb-4">
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">
                <FaShareAlt className="me-2" />
                Recent Shares
              </h5>
            </Card.Header>
            <Card.Body>
              {recentShares.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <FaShareAlt size={48} className="mb-3 opacity-50" />
                  <p>No shares created yet</p>
                  <Button as={Link} to="/files" variant="success" size="sm">
                    Share Your Files
                  </Button>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {recentShares.slice(0, 5).map((share) => (
                    <div key={share.id} className="list-group-item px-0">
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="flex-grow-1">
                          <h6 className="mb-1">
                            Share Link #{share.id}
                            {!share.is_active && (
                              <Badge bg="secondary" className="ms-2">Revoked</Badge>
                            )}
                            {share.is_expired && (
                              <Badge bg="warning" className="ms-2">Expired</Badge>
                            )}
                          </h6>
                          <small className="text-muted">
                            <FaClock className="me-1" />
                            {formatDate(share.created_at)}
                            {share.download_count > 0 && (
                              <span className="ms-2">
                                {share.download_count} downloads
                              </span>
                            )}
                          </small>
                        </div>
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/share/${share.share_link}`)}
                        >
                          Copy Link
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
            {recentShares.length > 0 && (
              <Card.Footer className="bg-transparent">
                <Button as={Link} to="/shared" variant="link" className="p-0">
                  View All Shares →
                </Button>
              </Card.Footer>
            )}
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;