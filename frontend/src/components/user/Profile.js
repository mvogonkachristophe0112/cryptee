import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Tab, Tabs, Badge } from 'react-bootstrap';
import { FaUser, FaKey, FaShieldAlt, FaSave, FaEdit, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { usersAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    bio: ''
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [storageInfo, setStorageInfo] = useState(null);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);

      // Load storage info
      const storageResponse = await usersAPI.getStorageInfo();
      setStorageInfo(storageResponse.data.storage);

      // Set profile data from user context
      if (user) {
        setProfileData({
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          email: user.email || '',
          bio: user.bio || ''
        });
      }
    } catch (error) {
      console.error('Failed to load profile data:', error);
      toast.error('Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      const result = await updateProfile(profileData);
      if (result.success) {
        toast.success('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Profile update error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.new_password.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }

    try {
      setSaving(true);
      const result = await changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });

      if (result.success) {
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
        toast.success('Password changed successfully!');
      }
    } catch (error) {
      console.error('Password change error:', error);
    } finally {
      setSaving(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (loading) {
    return <LoadingSpinner message="Loading profile..." />;
  }

  return (
    <Container className="py-4">
      {/* Header */}
      <div className="page-header">
        <h1>
          <FaUser className="me-3" />
          Profile Settings
        </h1>
        <p>Manage your account information and security settings</p>
      </div>

      <Row>
        <Col lg={8}>
          <Card>
            <Card.Body>
              <Tabs defaultActiveKey="profile" className="mb-4">
                <Tab eventKey="profile" title={<><FaUser className="me-1" />Profile</>}>
                  <Form onSubmit={handleProfileUpdate}>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>First Name</Form.Label>
                          <Form.Control
                            type="text"
                            value={profileData.first_name}
                            onChange={(e) => setProfileData(prev => ({
                              ...prev,
                              first_name: e.target.value
                            }))}
                            placeholder="Enter your first name"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Last Name</Form.Label>
                          <Form.Control
                            type="text"
                            value={profileData.last_name}
                            onChange={(e) => setProfileData(prev => ({
                              ...prev,
                              last_name: e.target.value
                            }))}
                            placeholder="Enter your last name"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group className="mb-3">
                      <Form.Label>Email Address</Form.Label>
                      <Form.Control
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData(prev => ({
                          ...prev,
                          email: e.target.value
                        }))}
                        placeholder="Enter your email"
                      />
                      <Form.Text className="text-muted">
                        Email cannot be changed. Contact support if needed.
                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label>Bio</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={profileData.bio}
                        onChange={(e) => setProfileData(prev => ({
                          ...prev,
                          bio: e.target.value
                        }))}
                        placeholder="Tell us about yourself..."
                      />
                    </Form.Group>

                    <Button
                      type="submit"
                      variant="primary"
                      disabled={saving}
                      className="d-flex align-items-center"
                    >
                      {saving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <FaSave className="me-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </Form>
                </Tab>

                <Tab eventKey="security" title={<><FaKey className="me-1" />Security</>}>
                  <Form onSubmit={handlePasswordChange}>
                    <Form.Group className="mb-3">
                      <Form.Label>Current Password</Form.Label>
                      <div className="position-relative">
                        <Form.Control
                          type={showPasswords.current ? 'text' : 'password'}
                          value={passwordData.current_password}
                          onChange={(e) => setPasswordData(prev => ({
                            ...prev,
                            current_password: e.target.value
                          }))}
                          placeholder="Enter current password"
                          required
                        />
                        <Button
                          variant="link"
                          className="position-absolute end-0 top-50 translate-middle-y text-muted"
                          onClick={() => togglePasswordVisibility('current')}
                          style={{ border: 'none', background: 'none' }}
                        >
                          {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
                        </Button>
                      </div>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>New Password</Form.Label>
                      <div className="position-relative">
                        <Form.Control
                          type={showPasswords.new ? 'text' : 'password'}
                          value={passwordData.new_password}
                          onChange={(e) => setPasswordData(prev => ({
                            ...prev,
                            new_password: e.target.value
                          }))}
                          placeholder="Enter new password"
                          required
                          minLength={8}
                        />
                        <Button
                          variant="link"
                          className="position-absolute end-0 top-50 translate-middle-y text-muted"
                          onClick={() => togglePasswordVisibility('new')}
                          style={{ border: 'none', background: 'none' }}
                        >
                          {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                        </Button>
                      </div>
                      <Form.Text className="text-muted">
                        Password must be at least 8 characters long.
                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label>Confirm New Password</Form.Label>
                      <div className="position-relative">
                        <Form.Control
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={passwordData.confirm_password}
                          onChange={(e) => setPasswordData(prev => ({
                            ...prev,
                            confirm_password: e.target.value
                          }))}
                          placeholder="Confirm new password"
                          required
                        />
                        <Button
                          variant="link"
                          className="position-absolute end-0 top-50 translate-middle-y text-muted"
                          onClick={() => togglePasswordVisibility('confirm')}
                          style={{ border: 'none', background: 'none' }}
                        >
                          {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                        </Button>
                      </div>
                    </Form.Group>

                    <Button
                      type="submit"
                      variant="primary"
                      disabled={saving}
                      className="d-flex align-items-center"
                    >
                      {saving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" />
                          Changing...
                        </>
                      ) : (
                        <>
                          <FaKey className="me-2" />
                          Change Password
                        </>
                      )}
                    </Button>
                  </Form>
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          {/* Account Info */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">
                <FaShieldAlt className="me-2" />
                Account Information
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <strong className="d-block mb-1">Account Status</strong>
                <Badge bg="success">Active</Badge>
              </div>
              <div className="mb-3">
                <strong className="d-block mb-1">Member Since</strong>
                <span>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}</span>
              </div>
              <div className="mb-3">
                <strong className="d-block mb-1">Last Login</strong>
                <span>{user?.last_login ? new Date(user.last_login).toLocaleDateString() : 'Unknown'}</span>
              </div>
            </Card.Body>
          </Card>

          {/* Storage Info */}
          {storageInfo && (
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">Storage Usage</h5>
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span>Used</span>
                    <span>{((storageInfo.used_bytes / storageInfo.limit_bytes) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="progress" style={{ height: '8px' }}>
                    <div
                      className="progress-bar bg-primary"
                      style={{
                        width: `${(storageInfo.used_bytes / storageInfo.limit_bytes) * 100}%`
                      }}
                    />
                  </div>
                </div>
                <div className="text-center">
                  <small className="text-muted">
                    {(storageInfo.used_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB of{' '}
                    {(storageInfo.limit_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB used
                  </small>
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Security Tips */}
          <Card>
            <Card.Header>
              <h5 className="mb-0">Security Tips</h5>
            </Card.Header>
            <Card.Body>
              <ul className="list-unstyled mb-0 small">
                <li className="mb-2">
                  <FaKey className="text-success me-2" />
                  Use strong, unique passwords
                </li>
                <li className="mb-2">
                  <FaShieldAlt className="text-info me-2" />
                  Enable two-factor authentication
                </li>
                <li className="mb-0">
                  <FaUser className="text-warning me-2" />
                  Keep your profile information current
                </li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Profile;