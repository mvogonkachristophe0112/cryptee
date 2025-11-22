import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Tab, Tabs } from 'react-bootstrap';
import { FaCog, FaLanguage, FaPalette, FaSave, FaHistory, FaBug, FaStar, FaComment } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/TranslationContext';
import { api } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';

const Settings = () => {
  const { user } = useAuth();
  const { t, currentLanguage, changeLanguage } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    language: currentLanguage,
    theme: 'light',
    notifications: true
  });

  // History, feedback, etc. states
  const [history, setHistory] = useState([]);
  const [feedbackData, setFeedbackData] = useState({ type: 'general', message: '' });
  const [bugReportData, setBugReportData] = useState({ description: '', steps: '', expected: '', actual: '' });
  const [rating, setRating] = useState(0);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
  ];

  const themes = [
    { value: 'light', name: 'Light', icon: '☀️' },
    { value: 'dark', name: 'Dark', icon: '🌙' },
    { value: 'auto', name: 'Auto', icon: '🌓' }
  ];

  useEffect(() => {
    loadSettings();
    loadHistory();

    // Apply saved theme
    const savedTheme = localStorage.getItem('cryptee_theme') || 'light';
    setSettings(prev => ({ ...prev, theme: savedTheme }));
    applyTheme(savedTheme);
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Use defaults if API fails
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await api.get('/history');
      setHistory(response.data);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await api.post('/settings', settings);
      toast.success('Settings saved successfully!');
      // Apply theme immediately
      applyTheme(settings.theme);
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const applyTheme = (theme) => {
    const root = document.documentElement;
    localStorage.setItem('cryptee_theme', theme);

    if (theme === 'dark') {
      root.setAttribute('data-bs-theme', 'dark');
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else if (theme === 'light') {
      root.setAttribute('data-bs-theme', 'light');
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    } else {
      // Auto theme based on system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-bs-theme', prefersDark ? 'dark' : 'light');
      document.body.classList.toggle('dark-theme', prefersDark);
      document.body.classList.toggle('light-theme', !prefersDark);
    }
  };

  const handleLanguageChange = async (language) => {
    setSettings(prev => ({ ...prev, language }));
    await changeLanguage(language);
  };

  const handleThemeChange = (theme) => {
    setSettings(prev => ({ ...prev, theme }));
    applyTheme(theme); // Apply immediately
  };

  const submitFeedback = async () => {
    try {
      await api.post('/feedback', feedbackData);
      toast.success('Feedback submitted successfully!');
      setFeedbackData({ type: 'general', message: '' });
    } catch (error) {
      toast.error('Failed to submit feedback');
    }
  };

  const submitBugReport = async () => {
    try {
      await api.post('/bug-report', bugReportData);
      toast.success('Bug report submitted successfully!');
      setBugReportData({ description: '', steps: '', expected: '', actual: '' });
    } catch (error) {
      toast.error('Failed to submit bug report');
    }
  };

  const submitRating = async () => {
    try {
      await api.post('/rate', { rating });
      toast.success('Rating submitted successfully!');
      setRating(0);
    } catch (error) {
      toast.error('Failed to submit rating');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading settings..." />;
  }

  return (
    <Container className="py-4">
      {/* Header */}
      <div className="page-header">
        <h1>
          <FaCog className="me-3" />
          {t('settings.title', 'Settings')}
        </h1>
        <p>Customize your Cryptee experience</p>
      </div>

      <Row>
        <Col lg={12}>
          <Card>
            <Card.Body>
              <Tabs defaultActiveKey="general" className="mb-4">
                <Tab eventKey="general" title={<><FaCog className="me-1" />General</>}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label><FaLanguage className="me-2" />{t('settings.language', 'Language')}</Form.Label>
                        <Form.Select
                          value={settings.language}
                          onChange={(e) => handleLanguageChange(e.target.value)}
                        >
                          {languages.map(lang => (
                            <option key={lang.code} value={lang.code}>
                              {lang.flag} {lang.name}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label><FaPalette className="me-2" />{t('settings.theme', 'Theme')}</Form.Label>
                        <Form.Select
                          value={settings.theme}
                          onChange={(e) => handleThemeChange(e.target.value)}
                        >
                          {themes.map(theme => (
                            <option key={theme.value} value={theme.value}>
                              {theme.icon} {theme.name}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Check
                    type="switch"
                    id="notifications"
                    label="Enable notifications"
                    checked={settings.notifications}
                    onChange={(e) => setSettings(prev => ({ ...prev, notifications: e.target.checked }))}
                    className="mb-4"
                  />

                  <Button
                    variant="primary"
                    onClick={saveSettings}
                    disabled={saving}
                    className="d-flex align-items-center"
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <FaSave className="me-2" />
                        Save Settings
                      </>
                    )}
                  </Button>
                </Tab>

                <Tab eventKey="history" title={<><FaHistory className="me-1" />History</>}>
                  <div className="history-list">
                    {history.length === 0 ? (
                      <p className="text-muted">No activity history available</p>
                    ) : (
                      history.map(item => (
                        <div key={item.id} className="history-item border-bottom py-2">
                          <div className="d-flex justify-content-between">
                            <span>{item.action}: {item.details}</span>
                            <small className="text-muted">
                              {new Date(item.timestamp).toLocaleString()}
                            </small>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Tab>

                <Tab eventKey="feedback" title={<><FaComment className="me-1" />Feedback</>}>
                  <Form.Group className="mb-3">
                    <Form.Label>Feedback Type</Form.Label>
                    <Form.Select
                      value={feedbackData.type}
                      onChange={(e) => setFeedbackData(prev => ({ ...prev, type: e.target.value }))}
                    >
                      <option value="general">General</option>
                      <option value="feature">Feature Request</option>
                      <option value="improvement">Improvement</option>
                      <option value="other">Other</option>
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Message</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      value={feedbackData.message}
                      onChange={(e) => setFeedbackData(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Tell us what you think..."
                    />
                  </Form.Group>

                  <Button
                    variant="primary"
                    onClick={submitFeedback}
                    disabled={!feedbackData.message.trim()}
                  >
                    Submit Feedback
                  </Button>
                </Tab>

                <Tab eventKey="bug-report" title={<><FaBug className="me-1" />Bug Report</>}>
                  <Form.Group className="mb-3">
                    <Form.Label>Bug Description</Form.Label>
                    <Form.Control
                      type="text"
                      value={bugReportData.description}
                      onChange={(e) => setBugReportData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of the bug"
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Steps to Reproduce</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={bugReportData.steps}
                      onChange={(e) => setBugReportData(prev => ({ ...prev, steps: e.target.value }))}
                      placeholder="1. Step one&#10;2. Step two&#10;3. ..."
                    />
                  </Form.Group>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Expected Behavior</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          value={bugReportData.expected}
                          onChange={(e) => setBugReportData(prev => ({ ...prev, expected: e.target.value }))}
                          placeholder="What should happen"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Actual Behavior</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          value={bugReportData.actual}
                          onChange={(e) => setBugReportData(prev => ({ ...prev, actual: e.target.value }))}
                          placeholder="What actually happens"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Button
                    variant="primary"
                    onClick={submitBugReport}
                    disabled={!bugReportData.description.trim()}
                  >
                    Submit Bug Report
                  </Button>
                </Tab>

                <Tab eventKey="rate" title={<><FaStar className="me-1" />Rate App</>}>
                  <div className="text-center py-4">
                    <h5>How would you rate Cryptee?</h5>
                    <div className="mb-3">
                      {[1, 2, 3, 4, 5].map(star => (
                        <FaStar
                          key={star}
                          size={30}
                          className={`me-2 ${star <= rating ? 'text-warning' : 'text-muted'}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setRating(star)}
                        />
                      ))}
                    </div>
                    <Button
                      variant="primary"
                      onClick={submitRating}
                      disabled={rating === 0}
                    >
                      Submit Rating
                    </Button>
                  </div>
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Settings;