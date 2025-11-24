import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, ListGroup, Alert } from 'react-bootstrap';
import { FaComments, FaPlus, FaArrowLeft } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { chatAPI } from '../../services/api';
import ChatWindow from './ChatWindow';
import NewChat from './NewChat';
import LoadingSpinner from '../common/LoadingSpinner';

const Chat = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getConversations();
      setConversations(response.data.conversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const handleConversationCreated = (conversation) => {
    setConversations(prev => [conversation, ...prev]);
    setSelectedConversation(conversation);
    setShowNewChat(false);
  };

  const handleMessageSent = (conversationId, message) => {
    // Update the conversation in the list
    setConversations(prev => prev.map(conv =>
      conv.conversation_id === conversationId
        ? { ...conv, last_message: message, updated_at: message.created_at }
        : conv
    ));
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
    setShowNewChat(false);
  };

  if (loading) {
    return <LoadingSpinner message="Loading conversations..." />;
  }

  return (
    <Container className="py-4">
      <div className="page-header">
        <h1>
          <FaComments className="me-3" />
          CrypChat
        </h1>
        <p>Secure end-to-end encrypted messaging</p>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      <Row>
        {/* Conversations List */}
        {(!selectedConversation && !showNewChat) && (
          <Col lg={4} className="mb-4">
            <Card className="h-100">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Conversations</h5>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowNewChat(true)}
                >
                  <FaPlus className="me-1" />
                  New Chat
                </Button>
              </Card.Header>
              <Card.Body className="p-0">
                {conversations.length === 0 ? (
                  <div className="text-center py-5">
                    <FaComments size={48} className="text-muted mb-3" />
                    <p className="text-muted">No conversations yet</p>
                    <Button
                      variant="primary"
                      onClick={() => setShowNewChat(true)}
                    >
                      <FaPlus className="me-1" />
                      Start Your First Chat
                    </Button>
                  </div>
                ) : (
                  <ListGroup variant="flush">
                    {conversations.map((conversation) => (
                      <ListGroup.Item
                        key={conversation.conversation_id}
                        action
                        onClick={() => setSelectedConversation(conversation)}
                        className="d-flex align-items-center"
                      >
                        <div
                          className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3"
                          style={{ width: 40, height: 40, fontSize: '16px', fontWeight: 'bold' }}
                        >
                          {conversation.participant?.username?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="flex-grow-1">
                          <div className="fw-bold">
                            {conversation.participant?.username || 'Unknown User'}
                          </div>
                          <small className="text-muted">
                            {conversation.last_message?.content?.substring(0, 50) || 'No messages yet'}
                            {conversation.last_message?.content?.length > 50 && '...'}
                          </small>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </Card.Body>
            </Card>
          </Col>
        )}

        {/* Chat Window or New Chat */}
        <Col lg={selectedConversation || showNewChat ? 12 : 8}>
          {showNewChat ? (
            <NewChat
              onConversationCreated={handleConversationCreated}
              onCancel={() => setShowNewChat(false)}
            />
          ) : selectedConversation ? (
            <div>
              <div className="mb-3">
                <Button
                  variant="outline-secondary"
                  onClick={handleBackToList}
                  className="d-flex align-items-center"
                >
                  <FaArrowLeft className="me-1" />
                  Back to Conversations
                </Button>
              </div>
              <ChatWindow
                conversation={selectedConversation}
                onMessageSent={handleMessageSent}
              />
            </div>
          ) : (
            <Card className="h-100 d-flex align-items-center justify-content-center">
              <div className="text-center">
                <FaComments size={64} className="text-muted mb-4" />
                <h4>Welcome to CrypChat</h4>
                <p className="text-muted mb-4">
                  Select a conversation from the list or start a new chat
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setShowNewChat(true)}
                >
                  <FaPlus className="me-2" />
                  Start New Conversation
                </Button>
              </div>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default Chat;