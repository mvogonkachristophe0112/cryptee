import React, { useState } from 'react';
import { Card, Form, Button, Alert, ListGroup } from 'react-bootstrap';
import { FaUser, FaSearch, FaPlus } from 'react-icons/fa';
import { chatAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';

const NewChat = ({ onConversationCreated, onCancel }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      setError('');
      const response = await chatAPI.searchUsers(searchQuery.trim());
      setSearchResults(response.data.users);
    } catch (error) {
      console.error('Search failed:', error);
      setError('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleStartConversation = async (user) => {
    try {
      setCreating(true);
      setError('');
      const response = await chatAPI.createConversation(user.username);
      onConversationCreated(response.data.conversation);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to create conversation');
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card className="h-100">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Start New Conversation</h5>
        <Button variant="outline-secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </Card.Header>

      <Card.Body>
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        {/* Search */}
        <Form.Group className="mb-3">
          <Form.Label>Find a user to chat with</Form.Label>
          <div className="d-flex">
            <Form.Control
              type="text"
              placeholder="Enter username or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
            <Button
              variant="outline-primary"
              onClick={handleSearch}
              disabled={!searchQuery.trim() || loading}
              className="ms-2"
            >
              <FaSearch />
            </Button>
          </div>
          <Form.Text className="text-muted">
            Search by username or email address
          </Form.Text>
        </Form.Group>

        {/* Search Results */}
        {loading ? (
          <LoadingSpinner message="Searching users..." />
        ) : searchResults.length > 0 ? (
          <div>
            <h6 className="mb-3">Search Results</h6>
            <ListGroup>
              {searchResults.map((user) => (
                <ListGroup.Item
                  key={user.id}
                  className="d-flex align-items-center justify-content-between"
                >
                  <div className="d-flex align-items-center">
                    <div
                      className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3"
                      style={{ width: 40, height: 40, fontSize: '18px', fontWeight: 'bold' }}
                    >
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="fw-bold">{user.username}</div>
                      <small className="text-muted">{user.email}</small>
                      {user.full_name && (
                        <div className="small text-muted">{user.full_name}</div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleStartConversation(user)}
                    disabled={creating}
                    className="d-flex align-items-center"
                  >
                    {creating ? (
                      <span className="spinner-border spinner-border-sm me-2" />
                    ) : (
                      <FaPlus className="me-1" />
                    )}
                    Start Chat
                  </Button>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </div>
        ) : searchQuery && !loading ? (
          <div className="text-center py-4">
            <FaUser size={32} className="text-muted mb-3" />
            <p className="text-muted">No users found</p>
            <small className="text-muted">
              Try searching with a different username or email
            </small>
          </div>
        ) : (
          <div className="text-center py-4">
            <FaSearch size={32} className="text-muted mb-3" />
            <p className="text-muted">Search for users to start chatting</p>
            <small className="text-muted">
              Enter a username or email address above
            </small>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default NewChat;