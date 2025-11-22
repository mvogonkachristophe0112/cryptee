import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import { messagesAPI } from '../services/api';
import Spinner from 'react-native-loading-spinner-overlay';

const ReceivedScreen = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const response = await messagesAPI.getMessages({
        type: 'received',
        per_page: 50
      });
      setMessages(response.data.messages);
    } catch (error) {
      console.log('Error loading received messages:', error);
      Alert.alert('Error', 'Failed to load received messages');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMessages();
    setRefreshing(false);
  };

  const handleMarkAsRead = async (messageId) => {
    try {
      await messagesAPI.markAsRead(messageId);
      // Update local state
      setMessages(messages.map(msg =>
        msg.id === messageId ? { ...msg, is_read: true } : msg
      ));
    } catch (error) {
      console.log('Error marking message as read:', error);
    }
  };

  const handleDeleteMessage = (messageId) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMessage(messageId)
        },
      ]
    );
  };

  const deleteMessage = async (messageId) => {
    try {
      await messagesAPI.deleteMessage(messageId);
      setMessages(messages.filter(msg => msg.id !== messageId));
      Alert.alert('Success', 'Message deleted successfully');
    } catch (error) {
      console.log('Error deleting message:', error);
      Alert.alert('Error', 'Failed to delete message');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderMessage = ({ item }) => {
    const isUnread = !item.is_read;

    return (
      <TouchableOpacity
        style={[styles.messageItem, isUnread && styles.messageItemUnread]}
        onPress={() => isUnread && handleMarkAsRead(item.id)}
      >
        <View style={styles.messageHeader}>
          <View style={styles.senderInfo}>
            <Icon name="person" size={20} color="#667eea" />
            <Text style={styles.senderName}>{item.sender.username}</Text>
          </View>
          <View style={styles.messageMeta}>
            <Text style={styles.date}>{formatDate(item.created_at)}</Text>
            {isUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>New</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.subject} numberOfLines={1}>
          {item.subject}
        </Text>

        <Text style={styles.content} numberOfLines={2}>
          {item.content}
        </Text>

        {item.attachments && item.attachments.length > 0 && (
          <View style={styles.attachments}>
            <Icon name="attach-file" size={16} color="#666" />
            <Text style={styles.attachmentsText}>
              {item.attachments.length} attachment{item.attachments.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        <View style={styles.messageActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteMessage(item.id)}
          >
            <Icon name="delete" size={20} color="#dc3545" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="inbox" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No received messages</Text>
      <Text style={styles.emptySubtext}>
        Messages you receive will appear here
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={messages.length === 0 ? styles.emptyList : null}
      />

      <Spinner
        visible={loading}
        textContent={'Loading messages...'}
        textStyle={styles.spinnerText}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  messageItem: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageItemUnread: {
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  senderName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#667eea',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  subject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  content: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  attachments: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  attachmentsText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  messageActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  spinnerText: {
    color: '#FFF',
  },
});

export default ReceivedScreen;