import React, { useState, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Alert, ProgressBar, Badge } from 'react-bootstrap';
import { useDropzone } from 'react-dropzone';
import CryptoJS from 'crypto-js';
import {
  FaLock,
  FaUnlock,
  FaFileAlt,
  FaDownload,
  FaTrash,
  FaKey,
  FaShieldAlt,
  FaExclamationTriangle
} from 'react-icons/fa';

const OfflineEncryption = () => {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('encrypt'); // 'encrypt' or 'decrypt'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const onDrop = useCallback((acceptedFiles) => {
    setFiles(prev => [...prev, ...acceptedFiles.map(file => ({
      file,
      id: Date.now() + Math.random(),
      status: 'pending',
      originalName: file.name,
      size: file.size
    }))]);
    setError('');
    setSuccess('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    noClick: false
  });

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const processFile = async (fileObj) => {
    if (!password) {
      throw new Error('Password is required');
    }

    const file = fileObj.file;
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target.result;
          const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
          let result;

          if (mode === 'encrypt') {
            // Encrypt using AES
            result = CryptoJS.AES.encrypt(wordArray, password).toString();
          } else {
            // Decrypt using AES
            const bytes = CryptoJS.AES.decrypt(arrayBuffer, password);
            result = bytes.toString(CryptoJS.enc.Utf8);

            if (!result) {
              throw new Error('Invalid password or corrupted file');
            }
          }

          // Create blob for download
          const blob = new Blob([result], { type: 'application/octet-stream' });
          const url = URL.createObjectURL(blob);

          resolve({
            ...fileObj,
            status: 'completed',
            downloadUrl: url,
            processedName: mode === 'encrypt'
              ? `${file.name}.encrypted`
              : file.name.replace('.encrypted', '')
          });
        } catch (error) {
          reject(new Error(`Failed to ${mode} file: ${error.message}`));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const processAllFiles = async () => {
    if (files.length === 0) {
      setError('Please select files to process');
      return;
    }

    if (!password) {
      setError('Please enter a password');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setError('');
    setSuccess('');

    try {
      const totalFiles = files.length;
      const updatedFiles = [...files];

      for (let i = 0; i < totalFiles; i++) {
        const fileObj = updatedFiles[i];
        updatedFiles[i] = { ...fileObj, status: 'processing' };
        setFiles([...updatedFiles]);

        const processedFile = await processFile(fileObj);
        updatedFiles[i] = processedFile;

        setProgress(((i + 1) / totalFiles) * 100);
        setFiles([...updatedFiles]);
      }

      setSuccess(`Successfully ${mode === 'encrypt' ? 'encrypted' : 'decrypted'} ${totalFiles} file(s)`);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const downloadFile = (fileObj) => {
    const link = document.createElement('a');
    link.href = fileObj.downloadUrl;
    link.download = fileObj.processedName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearAll = () => {
    setFiles([]);
    setError('');
    setSuccess('');
    setProgress(0);
  };

  return (
    <Container className="py-4">
      <div className="page-header">
        <h1>
          <FaShieldAlt className="me-3" />
          Offline Encryption
        </h1>
        <p>Encrypt and decrypt files locally on your device</p>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4">
          <FaExclamationTriangle className="me-2" />
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" className="mb-4">
          <FaShieldAlt className="me-2" />
          {success}
        </Alert>
      )}

      <Row className="mb-4">
        <Col lg={8}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                {mode === 'encrypt' ? <FaLock className="me-2" /> : <FaUnlock className="me-2" />}
                {mode === 'encrypt' ? 'Encrypt Files' : 'Decrypt Files'}
              </h5>
            </Card.Header>
            <Card.Body>
              {/* Mode Toggle */}
              <div className="d-flex gap-2 mb-4">
                <Button
                  variant={mode === 'encrypt' ? 'primary' : 'outline-primary'}
                  onClick={() => setMode('encrypt')}
                >
                  <FaLock className="me-1" />
                  Encrypt
                </Button>
                <Button
                  variant={mode === 'decrypt' ? 'primary' : 'outline-primary'}
                  onClick={() => setMode('decrypt')}
                >
                  <FaUnlock className="me-1" />
                  Decrypt
                </Button>
              </div>

              {/* Password Input */}
              <div className="mb-4">
                <label className="form-label">
                  <FaKey className="me-1" />
                  Password
                </label>
                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter encryption/decryption password"
                  required
                />
                <small className="text-muted">
                  Use a strong password. Remember it - files cannot be recovered without it.
                </small>
              </div>

              {/* File Drop Zone */}
              <div
                {...getRootProps()}
                className={`upload-area mb-4 ${isDragActive ? 'drag-over' : ''}`}
                style={{ cursor: 'pointer' }}
              >
                <input {...getInputProps()} />
                <FaFileAlt size={48} className="mb-3" />
                <h5>{isDragActive ? 'Drop files here' : 'Drag & drop files here'}</h5>
                <p className="mb-0">or click to select files</p>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="mb-4">
                  <h6>Selected Files ({files.length})</h6>
                  <div className="list-group">
                    {files.map((fileObj) => (
                      <div key={fileObj.id} className="list-group-item d-flex justify-content-between align-items-center">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center">
                            <FaFileAlt className="me-2" />
                            <div>
                              <strong>{fileObj.originalName}</strong>
                              <br />
                              <small className="text-muted">
                                {(fileObj.size / 1024).toFixed(1)} KB
                              </small>
                            </div>
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <Badge
                            bg={
                              fileObj.status === 'completed' ? 'success' :
                              fileObj.status === 'processing' ? 'warning' :
                              fileObj.status === 'error' ? 'danger' : 'secondary'
                            }
                          >
                            {fileObj.status}
                          </Badge>
                          {fileObj.status === 'completed' && (
                            <Button
                              size="sm"
                              variant="outline-success"
                              onClick={() => downloadFile(fileObj)}
                            >
                              <FaDownload />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => removeFile(fileObj.id)}
                          >
                            <FaTrash />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              {processing && (
                <div className="mb-4">
                  <ProgressBar now={progress} label={`${progress.toFixed(0)}%`} />
                  <small className="text-muted">Processing files...</small>
                </div>
              )}

              {/* Action Buttons */}
              <div className="d-flex gap-2">
                <Button
                  variant="primary"
                  onClick={processAllFiles}
                  disabled={processing || files.length === 0 || !password}
                >
                  {mode === 'encrypt' ? <FaLock className="me-1" /> : <FaUnlock className="me-1" />}
                  {mode === 'encrypt' ? 'Encrypt Files' : 'Decrypt Files'}
                </Button>
                <Button variant="outline-secondary" onClick={clearAll}>
                  Clear All
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="mb-4">
            <Card.Header>
              <h6 className="mb-0">
                <FaShieldAlt className="me-2" />
                Security Notes
              </h6>
            </Card.Header>
            <Card.Body>
              <ul className="list-unstyled mb-0">
                <li className="mb-2">
                  <FaKey className="me-2 text-primary" />
                  Files are processed locally on your device
                </li>
                <li className="mb-2">
                  <FaShieldAlt className="me-2 text-success" />
                  AES-256 encryption for maximum security
                </li>
                <li className="mb-2">
                  <FaExclamationTriangle className="me-2 text-warning" />
                  Never forget your password - files cannot be recovered
                </li>
                <li>
                  <FaFileAlt className="me-2 text-info" />
                  Encrypted files get .encrypted extension
                </li>
              </ul>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <h6 className="mb-0">How It Works</h6>
            </Card.Header>
            <Card.Body>
              <ol className="mb-0">
                <li>Select encrypt or decrypt mode</li>
                <li>Enter your password</li>
                <li>Drag & drop or select files</li>
                <li>Click process to start</li>
                <li>Download processed files</li>
              </ol>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default OfflineEncryption;