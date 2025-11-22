import React, { useState, useCallback } from 'react';
import { Container, Row, Col, Card, Button, ProgressBar, Alert, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { FaCloudUploadAlt, FaFileAlt, FaTimes, FaCheck } from 'react-icons/fa';
import { filesAPI, formatFileSize } from '../../services/api';

const FileUpload = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending'
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 100 * 1024 * 1024 // 100MB
  });

  const uploadFile = async (fileData) => {
    try {
      setUploadProgress(prev => ({ ...prev, [fileData.id]: 0 }));

      const response = await filesAPI.uploadFile(fileData.file, (progress) => {
        setUploadProgress(prev => ({
          ...prev,
          [fileData.id]: Math.round((progress.loaded / progress.total) * 100)
        }));
      });

      setUploadedFiles(prev => prev.map(f =>
        f.id === fileData.id
          ? { ...f, status: 'completed', uploadedFile: response.data.file }
          : f
      ));

      toast.success(`${fileData.name} uploaded successfully!`);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadedFiles(prev => prev.map(f =>
        f.id === fileData.id
          ? { ...f, status: 'error', error: error.response?.data?.error || 'Upload failed' }
          : f
      ));
      toast.error(`Failed to upload ${fileData.name}`);
    }
  };

  const uploadAllFiles = async () => {
    setUploading(true);
    const pendingFiles = uploadedFiles.filter(f => f.status === 'pending');

    for (const fileData of pendingFiles) {
      await uploadFile(fileData);
    }

    setUploading(false);
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
  };

  const clearCompleted = () => {
    setUploadedFiles(prev => prev.filter(f => f.status !== 'completed'));
  };

  return (
    <Container className="py-4">
      {/* Header */}
      <div className="page-header">
        <h1>
          <FaCloudUploadAlt className="me-3" />
          Upload Files
        </h1>
        <p>Securely upload and encrypt your files</p>
      </div>

      {/* Upload Area */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body className="text-center py-5">
              <div
                {...getRootProps()}
                className={`upload-area ${isDragActive ? 'drag-over' : ''}`}
              >
                <input {...getInputProps()} />
                <FaCloudUploadAlt size={64} className="text-primary mb-3" />
                <h4 className="mb-3">
                  {isDragActive ? 'Drop files here...' : 'Drag & drop files here'}
                </h4>
                <p className="text-muted mb-3">
                  or <Button variant="link" className="p-0">browse files</Button>
                </p>
                <small className="text-muted">
                  Maximum file size: 100MB • Files are encrypted before upload
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <FaFileAlt className="me-2" />
                  Files to Upload ({uploadedFiles.length})
                </h5>
                <div>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={uploadAllFiles}
                    disabled={uploading || !uploadedFiles.some(f => f.status === 'pending')}
                    className="me-2"
                  >
                    {uploading ? 'Uploading...' : 'Upload All'}
                  </Button>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={clearCompleted}
                    disabled={!uploadedFiles.some(f => f.status === 'completed')}
                  >
                    Clear Completed
                  </Button>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="list-group list-group-flush">
                  {uploadedFiles.map((fileData) => (
                    <div key={fileData.id} className="list-group-item px-4 py-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center mb-2">
                            <FaFileAlt className="me-2 text-muted" />
                            <h6 className="mb-0 me-2">{fileData.name}</h6>
                            <Badge
                              bg={
                                fileData.status === 'completed' ? 'success' :
                                fileData.status === 'error' ? 'danger' : 'secondary'
                              }
                            >
                              {fileData.status === 'completed' && <FaCheck className="me-1" />}
                              {fileData.status === 'error' && <FaTimes className="me-1" />}
                              {fileData.status === 'pending' ? 'Pending' :
                               fileData.status === 'completed' ? 'Completed' :
                               'Error'}
                            </Badge>
                          </div>
                          <div className="d-flex justify-content-between align-items-center">
                            <small className="text-muted">
                              {formatFileSize(fileData.size)}
                            </small>
                            {fileData.status === 'uploading' && uploadProgress[fileData.id] !== undefined && (
                              <div className="flex-grow-1 mx-3">
                                <ProgressBar
                                  now={uploadProgress[fileData.id]}
                                  label={`${uploadProgress[fileData.id]}%`}
                                  style={{ height: '6px' }}
                                />
                              </div>
                            )}
                          </div>
                          {fileData.error && (
                            <Alert variant="danger" className="mt-2 py-1 px-2 small">
                              {fileData.error}
                            </Alert>
                          )}
                        </div>
                        <div className="ms-3">
                          {fileData.status === 'completed' && fileData.uploadedFile && (
                            <Button
                              as={Link}
                              to={`/files/${fileData.uploadedFile.id}`}
                              variant="outline-primary"
                              size="sm"
                              className="me-2"
                            >
                              View
                            </Button>
                          )}
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => removeFile(fileData.id)}
                            disabled={fileData.status === 'uploading'}
                          >
                            <FaTimes />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Quick Actions */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Quick Actions</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-flex flex-wrap gap-2">
                <Button as={Link} to="/files" variant="outline-primary">
                  <FaFileAlt className="me-1" />
                  Browse Files
                </Button>
                <Button as={Link} to="/shared" variant="outline-success">
                  <FaCloudUploadAlt className="me-1" />
                  Manage Shares
                </Button>
                <Button as={Link} to="/dashboard" variant="outline-info">
                  <FaCloudUploadAlt className="me-1" />
                  Back to Dashboard
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default FileUpload;