import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
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

const HistoryScreen = () => {
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, sent, received
  const [showFilters, setShowFilters] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    filterMessages();
  }, [messages, searchQuery, filterType]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const response = await messagesAPI.getMessages({
        type: 'all',
        per_page: 100
      });
      setMessages(response.data.messages);
    } catch (error) {
      console.log('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMessages();
    setRefreshing(false);
  };

  const filterMessages = () => {
    let filtered = messages;

    // Apply type filter
    if (filterType === 'sent') {
      filtered = filtered.filter(msg => msg.sender.id === user.id);
    } else if (filterType === 'received') {
      filtered = filtered.filter(msg => msg.recipient.id === user.id);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(msg =>
        msg.subject.toLowerCase().includes(query) ||
        msg.content.toLowerCase().includes(query) ||
        msg.sender.username.toLowerCase().includes(query) ||
        msg.recipient.username.toLowerCase().includes(query)
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setFilteredMessages(filtered);
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
    const isSent = item.sender.id === user.id;
    const otherUser = isSent ? item.recipient : item.sender;

    return (
      <TouchableOpacity style={styles.messageItem}>
        <View style={styles.messageHeader}>
          <View style={styles.userInfo}>
            <Icon
              name={isSent ? 'send' : 'inbox'}
              size={20}
              color={isSent ? '#28a745' : '#667eea'}
            />
            <Text style={styles.username}>{otherUser.username}</Text>
          </View>
          <View style={styles.messageMeta}>
            <Text style={styles.date}>{formatDate(item.created_at)}</Text>
            {!item.is_read && !isSent && (
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
      <Icon name="mail" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No messages found</Text>
      <Text style={styles.emptySubtext}>
        {searchQuery || filterType !== 'all'
          ? 'Try adjusting your search or filters'
          : 'Your message history will appear here'
        }
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search and Filter Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search messages..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close" size={20} color="#666" />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Icon name="filter-list" size={20} color="#667eea" />
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Options */}
      {showFilters && (
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterOption, filterType === 'all' && styles.filterOptionActive]}
            onPress={() => setFilterType('all')}
          >
            <Text style={[styles.filterOptionText, filterType === 'all' && styles.filterOptionTextActive]}>
              All Messages
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterOption, filterType === 'sent' && styles.filterOptionActive]}
            onPress={() => setFilterType('sent')}
          >
            <Text style={[styles.filterOptionText, filterType === 'sent' && styles.filterOptionTextActive]}>
              Sent
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterOption, filterType === 'received' && styles.filterOptionActive]}
            onPress={() => setFilterType('received')}
          >
            <Text style={[styles.filterOptionText, filterType === 'received' && styles.filterOptionTextActive]}>
              Received
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Messages List */}
      <FlatList
        data={filteredMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={filteredMessages.length === 0 ? styles.emptyList : null}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterButtonText: {
    marginLeft: 5,
    color: '#667eea',
    fontSize: 14,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterOption: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
  },
  filterOptionActive: {
    backgroundColor: '#667eea',
  },
  filterOptionText: {
    color: '#666',
    fontSize: 14,
  },
  filterOptionTextActive: {
    color: '#fff',
    fontWeight: 'bold',
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
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
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

export default HistoryScreen;