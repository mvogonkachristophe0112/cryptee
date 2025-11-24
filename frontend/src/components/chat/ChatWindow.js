import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Button, InputGroup, Dropdown } from 'react-bootstrap';
import { FaPaperPlane, FaUser, FaClock, FaSmile, FaThumbsUp, FaHeart, FaLaugh, FaSadTear } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { chatAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';

const ChatWindow = ({ conversation, onMessageSent }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);

  const emojis = ['👍', '❤️', '😂', '😢', '😮', '👏', '🔥', '💯'];

  useEffect(() => {
    loadMessages();
  }, [conversation.conversation_id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getConversation(conversation.conversation_id);
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const response = await chatAPI.sendMessage(conversation.conversation_id, newMessage.trim());

      // Add the new message to the list
      setMessages(prev => [...prev, response.data.message]);
      setNewMessage('');

      // Notify parent component
      onMessageSent(conversation.conversation_id, response.data.message);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const addEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  if (loading) {
    return (
      <Card className="h-100">
        <Card.Body className="d-flex align-items-center justify-content-center">
          <LoadingSpinner message="Loading messages..." />
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="h-100 d-flex flex-column">
      {/* Header */}
      <Card.Header className="d-flex align-items-center">
        <div
          className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3"
          style={{ width: 40, height: 40, fontSize: '18px', fontWeight: 'bold' }}
        >
          {conversation.participant?.username?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="flex-grow-1">
          <h5 className="mb-0">{conversation.participant?.username || 'Unknown User'}</h5>
          <small className="text-muted d-block">
            {conversation.participant?.email || ''}
          </small>
          {conversation.participant?.cryptee_id && (
            <small className="text-info d-block">
              <strong>Cryptee ID:</strong> {conversation.participant.cryptee_id}
            </small>
          )}
          {conversation.participant?.public_key && (
            <small className="text-success d-block" style={{ wordBreak: 'break-all', fontSize: '10px' }}>
              <strong>Public Key:</strong> {conversation.participant.public_key.substring(0, 50)}...
            </small>
          )}
        </div>
      </Card.Header>

      {/* Messages */}
      <Card.Body className="flex-grow-1 overflow-auto p-3" style={{ maxHeight: '500px' }}>
        {messages.length === 0 ? (
          <div className="text-center py-5">
            <FaUser size={32} className="text-muted mb-3" />
            <p className="text-muted">No messages yet</p>
            <small className="text-muted">Send the first message to start the conversation</small>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`d-flex mb-3 ${
                message.sender?.id === user.id ? 'justify-content-end' : 'justify-content-start'
              }`}
            >
              {message.sender?.id !== user.id && (
                <div
                  className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center me-2"
                  style={{ width: 32, height: 32, fontSize: '14px', fontWeight: 'bold' }}
                >
                  {message.sender?.username?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <div
                className={`p-3 rounded-3 shadow-sm ${
                  message.sender?.id === user.id
                    ? 'bg-primary text-white message-bubble-sent'
                    : 'bg-white border message-bubble-received'
                }`}
                style={{ maxWidth: '70%', position: 'relative' }}
              >
                {message.sender?.id !== user.id && (
                  <div className="mb-1">
                    <small className="fw-bold text-primary">
                      {message.sender?.username}
                    </small>
                  </div>
                )}
                <div className="message-content">{message.content}</div>
                <div className="d-flex justify-content-between align-items-center mt-2">
                  <small className={`${
                    message.sender?.id === user.id ? 'text-white-50' : 'text-muted'
                  }`}>
                    <FaClock className="me-1" />
                    {formatTime(message.created_at)}
                  </small>
                  {message.sender?.id === user.id && (
                    <small className="text-white-50">
                      ✓✓
                    </small>
                  )}
                </div>
                {message.is_expired && (
                  <small className="text-warning mt-1 d-block">
                    <FaClock className="me-1" />
                    This message has expired
                  </small>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </Card.Body>

      {/* Message Input */}
      <Card.Footer>
        <Form onSubmit={handleSendMessage}>
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={sending}
            />
            <Dropdown show={showEmojiPicker} onToggle={setShowEmojiPicker}>
              <Dropdown.Toggle
                variant="outline-secondary"
                id="emoji-dropdown"
                className="d-flex align-items-center"
              >
                <FaSmile />
              </Dropdown.Toggle>
              <Dropdown.Menu className="p-2" style={{ minWidth: '200px' }}>
                <div className="d-flex flex-wrap gap-2">
                  {emojis.map((emoji, index) => (
                    <Button
                      key={index}
                      variant="light"
                      size="sm"
                      onClick={() => addEmoji(emoji)}
                      className="emoji-btn"
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </Dropdown.Menu>
            </Dropdown>
            <Button
              type="submit"
              variant="primary"
              disabled={!newMessage.trim() || sending}
              className="d-flex align-items-center"
            >
              {sending ? (
                <span className="spinner-border spinner-border-sm me-2" />
              ) : (
                <FaPaperPlane className="me-2" />
              )}
              Send
            </Button>
          </InputGroup>
        </Form>
      </Card.Footer>
    </Card>
  );
};

export default ChatWindow;