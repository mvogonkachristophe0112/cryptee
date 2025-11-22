import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert, Form, InputGroup, Pagination } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaFileAlt, FaDownload, FaShareAlt, FaTrash, FaSearch, FaFilter, FaEye, FaPlus } from 'react-icons/fa';
import { filesAPI, formatFileSize, formatDate } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';

const FileList = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const filesPerPage = 12;

  useEffect(() => {
    loadFiles();
  }, [currentPage, searchTerm, filterType]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        per_page: filesPerPage,
        search: searchTerm || undefined,
        type: filterType !== 'all' ? filterType : undefined
      };

      const response = await filesAPI.listFiles(params);
      setFiles(response.data.files);
      setTotalPages(Math.ceil(response.data.pagination.total / filesPerPage));
    } catch (err) {
      console.error('Failed to load files:', err);
      setError('Failed to load files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file) => {
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

  const handleDelete = async (file) => {
    if (!window.confirm(`Are you sure you want to delete "${file.original_filename}"?`)) {
      return;
    }

    try {
      await filesAPI.deleteFile(file.id);
      setFiles(prev => prev.filter(f => f.id !== file.id));
      toast.success('File deleted successfully!');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete file');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${selectedFiles.length} selected files?`)) {
      return;
    }

    try {
      for (const fileId of selectedFiles) {
        await filesAPI.deleteFile(fileId);
      }
      setFiles(prev => prev.filter(f => !selectedFiles.includes(f.id)));
      setSelectedFiles([]);
      toast.success(`${selectedFiles.length} files deleted successfully!`);
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to delete some files');
    }
  };

  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const selectAllFiles = () => {
    if (selectedFiles.length === files.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(files.map(f => f.id));
    }
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
    return <LoadingSpinner message="Loading files..." />;
  }

  return (
    <Container className="py-4">
      {/* Header */}
      <div className="page-header">
        <h1>
          <FaFileAlt className="me-3" />
          My Files
        </h1>
        <p>Manage your encrypted files and documents</p>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
          <Button
            variant="outline-danger"
            size="sm"
            className="ms-3"
            onClick={loadFiles}
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
                      placeholder="Search files..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </InputGroup>
                </Col>
                <Col md={3}>
                  <Form.Select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="all">All Types</option>
                    <option value="document">Documents</option>
                    <option value="image">Images</option>
                    <option value="video">Videos</option>
                    <option value="audio">Audio</option>
                    <option value="archive">Archives</option>
                  </Form.Select>
                </Col>
                <Col md={3} className="text-end">
                  <Button as={Link} to="/upload" variant="primary">
                    <FaPlus className="me-1" />
                    Upload Files
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Bulk Actions */}
      {selectedFiles.length > 0 && (
        <Row className="mb-3">
          <Col>
            <Alert variant="info" className="d-flex justify-content-between align-items-center">
              <span>{selectedFiles.length} files selected</span>
              <div>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="me-2"
                >
                  <FaTrash className="me-1" />
                  Delete Selected
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setSelectedFiles([])}
                >
                  Clear Selection
                </Button>
              </div>
            </Alert>
          </Col>
        </Row>
      )}

      {/* Files Grid */}
      <Row className="mb-4">
        {files.length === 0 ? (
          <Col>
            <Card className="text-center py-5">
              <Card.Body>
                <FaFileAlt size={64} className="text-muted mb-3" />
                <h4>No files found</h4>
                <p className="text-muted">
                  {searchTerm || filterType !== 'all'
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Upload your first file to get started.'}
                </p>
                <Button as={Link} to="/upload" variant="primary">
                  <FaPlus className="me-1" />
                  Upload Files
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ) : (
          files.map((file) => (
            <Col key={file.id} lg={3} md={4} sm={6} className="mb-4">
              <Card className="file-item h-100">
                <Card.Body className="d-flex flex-column">
                  <div className="text-center mb-3">
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
                      {getFileIcon(file.original_filename)}
                    </div>
                    <Form.Check
                      type="checkbox"
                      checked={selectedFiles.includes(file.id)}
                      onChange={() => toggleFileSelection(file.id)}
                      className="mb-2"
                    />
                  </div>

                  <div className="flex-grow-1">
                    <h6 className="text-truncate mb-2" title={file.original_filename}>
                      {file.original_filename}
                    </h6>
                    <div className="mb-2">
                      <Badge bg="success" className="me-1">
                        <FaFileAlt className="me-1" />
                        Encrypted
                      </Badge>
                    </div>
                    <small className="text-muted d-block">
                      {formatFileSize(file.file_size)}
                    </small>
                    <small className="text-muted d-block">
                      {formatDate(file.upload_date)}
                    </small>
                  </div>

                  <div className="mt-3 d-flex gap-1">
                    <Button
                      as={Link}
                      to={`/files/${file.id}`}
                      variant="outline-primary"
                      size="sm"
                      className="flex-fill"
                    >
                      <FaEye className="me-1" />
                      View
                    </Button>
                    <Button
                      variant="outline-success"
                      size="sm"
                      onClick={() => handleDownload(file)}
                      className="flex-fill"
                    >
                      <FaDownload />
                    </Button>
                    <Button
                      as={Link}
                      to={`/share/${file.id}`}
                      variant="outline-info"
                      size="sm"
                      className="flex-fill"
                    >
                      <FaShareAlt />
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDelete(file)}
                      className="flex-fill"
                    >
                      <FaTrash />
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))
        )}
      </Row>

      {/* Pagination */}
      {totalPages > 1 && (
        <Row>
          <Col>
            <div className="d-flex justify-content-center">
              <Pagination>
                <Pagination.First
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                />
                <Pagination.Prev
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                />

                {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + idx;
                  return (
                    <Pagination.Item
                      key={pageNum}
                      active={pageNum === currentPage}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Pagination.Item>
                  );
                })}

                <Pagination.Next
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                />
                <Pagination.Last
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                />
              </Pagination>
            </div>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default FileList;