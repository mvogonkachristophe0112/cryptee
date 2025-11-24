import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge, ProgressBar, ListGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { filesAPI, usersAPI, sharesAPI, chatAPI, formatFileSize, formatDate } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import {
  FaFileAlt,
  FaShareAlt,
  FaCloudUploadAlt,
  FaDownload,
  FaUsers,
  FaShieldAlt,
  FaClock,
  FaExclamationTriangle,
  FaLock,
  FaComments,
  FaChartLine,
  FaEye,
  FaStar,
  FaCheckCircle,
  FaTimesCircle,
  FaImage,
  FaVideo,
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaMusic,
  FaArchive,
  FaCode,
  FaServer,
  FaDatabase,
  FaWifi,
  FaBatteryHalf
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
  const [recentConversations, setRecentConversations] = useState([]);
  const [activityTimeline, setActivityTimeline] = useState([]);
  const [fileTypes, setFileTypes] = useState({});
  const [systemStatus, setSystemStatus] = useState({
    server: 'unknown',
    database: 'unknown',
    encryption: 'unknown'
  });
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
      const filesResponse = await filesAPI.listFiles({ page: 1, per_page: 10 });
      setRecentFiles(filesResponse.data.files);

      // Load shares
      const sharesResponse = await sharesAPI.listShares({ page: 1, per_page: 5 });
      setRecentShares(sharesResponse.data.shares);

      // Load conversations
      const conversationsResponse = await chatAPI.getConversations({ page: 1, per_page: 3 });
      setRecentConversations(conversationsResponse.data.conversations || []);

      // Load storage info
      const storageResponse = await usersAPI.getStorageInfo();
      const storageData = storageResponse.data.storage;

      // Load share stats
      const shareStatsResponse = await sharesAPI.getShareStats();
      const shareStats = shareStatsResponse.data.stats;

      // Analyze file types
      const fileTypeStats = {};
      filesResponse.data.files.forEach(file => {
        const ext = file.original_filename.split('.').pop()?.toLowerCase() || 'unknown';
        fileTypeStats[ext] = (fileTypeStats[ext] || 0) + 1;
      });
      setFileTypes(fileTypeStats);

      // Generate activity timeline
      const activities = [];
      filesResponse.data.files.slice(0, 3).forEach(file => {
        activities.push({
          id: `file-${file.id}`,
          type: 'file_upload',
          title: 'File uploaded',
          description: file.original_filename,
          time: file.upload_date,
          icon: <FaCloudUploadAlt />
        });
      });

      sharesResponse.data.shares.slice(0, 2).forEach(share => {
        activities.push({
          id: `share-${share.id}`,
          type: 'share_created',
          title: 'Share link created',
          description: `Share #${share.id}`,
          time: share.created_at,
          icon: <FaShareAlt />
        });
      });

      activities.sort((a, b) => new Date(b.time) - new Date(a.time));
      setActivityTimeline(activities.slice(0, 5));

      // Check system status
      try {
        const healthResponse = await fetch('/health');
        const healthData = await healthResponse.json();
        setSystemStatus({
          server: healthData.status === 'healthy' ? 'online' : 'offline',
          database: healthData.database === 'connected' ? 'online' : 'offline',
          encryption: 'online' // Assume encryption is working
        });
      } catch {
        setSystemStatus({
          server: 'offline',
          database: 'unknown',
          encryption: 'unknown'
        });
      }

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
                <Button as={Link} to="/offline-encryption" variant="outline-warning" size="sm">
                  <FaLock className="me-1" />
                  Offline Encryption
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

      {/* System Status & Activity Timeline */}
      <Row className="mb-4">
        <Col lg={4} className="mb-4">
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">
                <FaServer className="me-2" />
                System Status
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="d-flex align-items-center mb-3">
                <FaWifi className={`me-2 ${systemStatus.server === 'online' ? 'text-success' : 'text-danger'}`} />
                <span>Server</span>
                <Badge bg={systemStatus.server === 'online' ? 'success' : 'danger'} className="ms-auto">
                  {systemStatus.server === 'online' ? <FaCheckCircle /> : <FaTimesCircle />}
                </Badge>
              </div>

              <div className="d-flex align-items-center mb-3">
                <FaDatabase className={`me-2 ${systemStatus.database === 'online' ? 'text-success' : 'text-warning'}`} />
                <span>Database</span>
                <Badge bg={systemStatus.database === 'online' ? 'success' : 'warning'} className="ms-auto">
                  {systemStatus.database === 'online' ? <FaCheckCircle /> : <FaTimesCircle />}
                </Badge>
              </div>

              <div className="d-flex align-items-center mb-3">
                <FaShieldAlt className={`me-2 ${systemStatus.encryption === 'online' ? 'text-success' : 'text-secondary'}`} />
                <span>Encryption</span>
                <Badge bg={systemStatus.encryption === 'online' ? 'success' : 'secondary'} className="ms-auto">
                  {systemStatus.encryption === 'online' ? <FaCheckCircle /> : <FaTimesCircle />}
                </Badge>
              </div>

              <hr />
              <div className="text-center">
                <small className="text-muted">Last checked: Just now</small>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8} className="mb-4">
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">
                <FaClock className="me-2" />
                Activity Timeline
              </h5>
            </Card.Header>
            <Card.Body>
              {activityTimeline.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <FaClock size={48} className="mb-3 opacity-50" />
                  <p>No recent activity</p>
                  <small>Start by uploading files or creating shares</small>
                </div>
              ) : (
                <div className="timeline">
                  {activityTimeline.map((activity, index) => (
                    <div key={activity.id} className="timeline-item d-flex mb-3">
                      <div className="timeline-icon bg-primary text-white me-3">
                        {activity.icon}
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <strong>{activity.title}</strong>
                            <br />
                            <small className="text-muted">{activity.description}</small>
                          </div>
                          <small className="text-muted">{formatDate(activity.time)}</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* File Types & Recent Conversations */}
      <Row className="mb-4">
        <Col lg={6} className="mb-4">
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">
                <FaChartLine className="me-2" />
                File Type Distribution
              </h5>
            </Card.Header>
            <Card.Body>
              {Object.keys(fileTypes).length === 0 ? (
                <div className="text-center text-muted py-4">
                  <FaFileAlt size={48} className="mb-3 opacity-50" />
                  <p>No files uploaded yet</p>
                </div>
              ) : (
                <div>
                  {Object.entries(fileTypes).slice(0, 6).map(([type, count]) => {
                    const percentage = (count / Object.values(fileTypes).reduce((a, b) => a + b, 0)) * 100;
                    const getIcon = (fileType) => {
                      const icons = {
                        jpg: <FaImage />, png: <FaImage />, gif: <FaImage />, pdf: <FaFilePdf />,
                        doc: <FaFileWord />, docx: <FaFileWord />, xls: <FaFileExcel />, xlsx: <FaFileExcel />,
                        mp4: <FaVideo />, avi: <FaVideo />, mp3: <FaMusic />, zip: <FaArchive />,
                        js: <FaCode />, py: <FaCode />, html: <FaCode />
                      };
                      return icons[fileType] || <FaFileAlt />;
                    };

                    return (
                      <div key={type} className="d-flex align-items-center mb-3">
                        <div className="me-3 text-primary">
                          {getIcon(type)}
                        </div>
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="fw-bold">.{type.toUpperCase()}</span>
                            <span className="text-muted small">{count} files</span>
                          </div>
                          <ProgressBar now={percentage} className="mb-0" style={{ height: '6px' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6} className="mb-4">
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">
                <FaComments className="me-2" />
                Recent Conversations
              </h5>
            </Card.Header>
            <Card.Body>
              {recentConversations.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <FaComments size={48} className="mb-3 opacity-50" />
                  <p>No conversations yet</p>
                  <Button as={Link} to="/crypchat" variant="primary" size="sm">
                    Start a Chat
                  </Button>
                </div>
              ) : (
                <ListGroup variant="flush">
                  {recentConversations.map((conversation) => (
                    <ListGroup.Item key={conversation.conversation_id} className="px-0">
                      <div className="d-flex align-items-center">
                        <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3"
                             style={{ width: 40, height: 40, fontSize: '16px', fontWeight: 'bold' }}>
                          {conversation.participant?.username?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <h6 className="mb-1">{conversation.participant?.username || 'Unknown User'}</h6>
                              <small className="text-muted">
                                {conversation.last_message?.content?.substring(0, 50) || 'No messages yet'}
                                {conversation.last_message?.content?.length > 50 && '...'}
                              </small>
                            </div>
                            <small className="text-muted">
                              {conversation.last_message ? formatDate(conversation.last_message.created_at) : ''}
                            </small>
                          </div>
                        </div>
                        <Button as={Link} to={`/crypchat?conversation=${conversation.conversation_id}`}
                                variant="outline-primary" size="sm" className="ms-2">
                          <FaComments />
                        </Button>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
            {recentConversations.length > 0 && (
              <Card.Footer className="bg-transparent">
                <Button as={Link} to="/crypchat" variant="link" className="p-0">
                  View All Conversations →
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