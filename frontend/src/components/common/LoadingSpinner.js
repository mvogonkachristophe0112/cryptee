import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Spinner, ProgressBar } from 'react-bootstrap';
import { FaShieldAlt, FaLock, FaRocket, FaMagic } from 'react-icons/fa';

const LoadingSpinner = ({
  message = 'Loading...',
  size = 'md',
  centered = true,
  showProgress = false,
  progress = 0,
  variant = 'primary',
  animated = true
}) => {
  const [dots, setDots] = useState('');
  const [currentIcon, setCurrentIcon] = useState(0);

  const icons = [
    <FaShieldAlt key="shield" size={48} className="text-primary mb-3" />,
    <FaLock key="lock" size={48} className="text-success mb-3" />,
    <FaRocket key="rocket" size={48} className="text-info mb-3" />,
    <FaMagic key="magic" size={48} className="text-warning mb-3" />
  ];

  // Animate dots for loading message
  useEffect(() => {
    if (!animated) return;

    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, [animated]);

  // Rotate icons for visual interest
  useEffect(() => {
    if (!animated) return;

    const iconInterval = setInterval(() => {
      setCurrentIcon(prev => (prev + 1) % icons.length);
    }, 2000);

    return () => clearInterval(iconInterval);
  }, [animated, icons.length]);

  const spinnerSize = {
    sm: 'sm',
    md: '',
    lg: 'grow'
  }[size];

  const content = (
    <div className="text-center py-5 loading-container">
      {/* Animated Icon */}
      <div className="mb-3 icon-container">
        <div className={`icon-wrapper ${animated ? 'animate-pulse' : ''}`}>
          {icons[currentIcon]}
        </div>
      </div>

      {/* Enhanced Spinner */}
      <div className="mb-3 spinner-container">
        <div className="spinner-ring">
          {spinnerSize === 'grow' ? (
            <Spinner
              animation="grow"
              variant={variant}
              style={{ width: '3rem', height: '3rem' }}
              className="custom-spinner"
            />
          ) : (
            <div className="custom-spinner-border">
              <Spinner
                animation="border"
                variant={variant}
                size={spinnerSize}
                className="custom-spinner"
              />
            </div>
          )}
        </div>
      </div>

      {/* Animated Message */}
      <div className="message-container">
        <h5 className="text-muted mb-2">
          {message}{animated ? dots : ''}
        </h5>
        {showProgress && (
          <div className="progress-container mt-3">
            <ProgressBar
              now={progress}
              animated={animated}
              variant={variant}
              className="custom-progress"
            />
            <small className="text-muted mt-1 d-block">
              {progress}% complete
            </small>
          </div>
        )}
      </div>

      {/* Loading Tips */}
      <div className="loading-tips mt-4">
        <small className="text-muted">
          <em>Tip: Cryptee uses end-to-end encryption to keep your files secure</em>
        </small>
      </div>
    </div>
  );

  if (centered) {
    return (
      <Container>
        <Row className="justify-content-center">
          <Col md={6} lg={4}>
            {content}
          </Col>
        </Row>
      </Container>
    );
  }

  return content;
};

export default LoadingSpinner;