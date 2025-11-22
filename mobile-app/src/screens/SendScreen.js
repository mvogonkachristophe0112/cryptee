import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import Contacts from 'react-native-contacts';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { useAuth } from '../context/AuthContext';
import { messagesAPI } from '../services/api';
import Spinner from 'react-native-loading-spinner-overlay';

const SendScreen = () => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const permission = await request(
        Platform.OS === 'ios'
          ? PERMISSIONS.IOS.CONTACTS
          : PERMISSIONS.ANDROID.READ_CONTACTS
      );

      if (permission === RESULTS.GRANTED) {
        const userContacts = await Contacts.getAll();
        setContacts(userContacts);
      }
    } catch (error) {
      console.log('Error loading contacts:', error);
    }
  };

  const handleAttachmentPress = () => {
    setShowAttachmentModal(true);
  };

  const handlePhotoAttachment = async () => {
    setShowAttachmentModal(false);

    const options = {
      mediaType: 'photo',
      quality: 0.8,
      storageOptions: {
        skipBackup: true,
        path: 'images',
      },
    };

    try {
      const result = await launchImageLibrary(options);
      if (result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const attachment = {
          type: 'image',
          uri: asset.uri,
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          mimeType: asset.type || 'image/jpeg',
          size: asset.fileSize,
        };
        setAttachments([...attachments, attachment]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  const handleVideoAttachment = async () => {
    setShowAttachmentModal(false);

    const options = {
      mediaType: 'video',
      quality: 0.8,
      storageOptions: {
        skipBackup: true,
        path: 'videos',
      },
    };

    try {
      const result = await launchImageLibrary(options);
      if (result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const attachment = {
          type: 'video',
          uri: asset.uri,
          name: asset.fileName || `video_${Date.now()}.mp4`,
          mimeType: asset.type || 'video/mp4',
          size: asset.fileSize,
        };
        setAttachments([...attachments, attachment]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select video');
    }
  };

  const handleMusicAttachment = async () => {
    setShowAttachmentModal(false);

    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.audio],
      });

      if (result && result[0]) {
        const file = result[0];
        const attachment = {
          type: 'audio',
          uri: file.uri,
          name: file.name,
          mimeType: file.type,
          size: file.size,
        };
        setAttachments([...attachments, attachment]);
      }
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        Alert.alert('Error', 'Failed to select music file');
      }
    }
  };

  const handleDocumentAttachment = async () => {
    setShowAttachmentModal(false);

    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.doc, DocumentPicker.types.docx],
      });

      if (result && result[0]) {
        const file = result[0];
        const attachment = {
          type: 'document',
          uri: file.uri,
          name: file.name,
          mimeType: file.type,
          size: file.size,
        };
        setAttachments([...attachments, attachment]);
      }
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        Alert.alert('Error', 'Failed to select document');
      }
    }
  };

  const handleContactAttachment = () => {
    setShowAttachmentModal(false);
    setShowContactsModal(true);
  };

  const selectContact = (contact) => {
    const contactData = {
      type: 'contact',
      name: contact.displayName || `${contact.givenName} ${contact.familyName}`,
      email: contact.emailAddresses?.[0]?.email,
      phone: contact.phoneNumbers?.[0]?.number,
    };
    setAttachments([...attachments, contactData]);
    setShowContactsModal(false);
  };

  const removeAttachment = (index) => {
    const newAttachments = [...attachments];
    newAttachments.splice(index, 1);
    setAttachments(newAttachments);
  };

  const handleSend = async () => {
    if (!recipientEmail || !subject || !content) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // First send the message
      const messageData = {
        recipient_email: recipientEmail,
        subject: subject,
        content: content,
        message_type: attachments.length > 0 ? 'file' : 'text',
      };

      const response = await messagesAPI.sendMessage(messageData);
      const messageId = response.data.message_data.id;

      // Upload attachments if any
      for (const attachment of attachments) {
        if (attachment.type !== 'contact') {
          const formData = new FormData();
          formData.append('file', {
            uri: attachment.uri,
            name: attachment.name,
            type: attachment.mimeType,
          });
          formData.append('attachment_type', attachment.type);

          await messagesAPI.uploadAttachment(messageId, formData);
        }
      }

      // Clear form
      setRecipientEmail('');
      setSubject('');
      setContent('');
      setAttachments([]);

      Alert.alert('Success', 'Message sent successfully!');
    } catch (error) {
      console.log('Send error:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderAttachment = ({ item, index }) => (
    <View style={styles.attachmentItem}>
      <Icon
        name={
          item.type === 'image' ? 'image' :
          item.type === 'video' ? 'videocam' :
          item.type === 'audio' ? 'music-note' :
          item.type === 'document' ? 'description' :
          'person'
        }
        size={20}
        color="#667eea"
      />
      <Text style={styles.attachmentText} numberOfLines={1}>
        {item.name || item.displayName || item.name}
      </Text>
      <TouchableOpacity onPress={() => removeAttachment(index)}>
        <Icon name="close" size={20} color="#dc3545" />
      </TouchableOpacity>
    </View>
  );

  const renderContact = ({ item }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => selectContact(item)}
    >
      <Icon name="person" size={24} color="#667eea" />
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>
          {item.displayName || `${item.givenName || ''} ${item.familyName || ''}`.trim()}
        </Text>
        {item.emailAddresses && item.emailAddresses.length > 0 && (
          <Text style={styles.contactEmail}>
            {item.emailAddresses[0].email}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Recipient Email"
            value={recipientEmail}
            onChangeText={setRecipientEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Subject"
            value={subject}
            onChangeText={setSubject}
          />

          <TextInput
            style={[styles.input, styles.messageInput]}
            placeholder="Message content..."
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {attachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              <Text style={styles.attachmentsTitle}>Attachments:</Text>
              <FlatList
                data={attachments}
                renderItem={renderAttachment}
                keyExtractor={(item, index) => index.toString()}
                scrollEnabled={false}
              />
            </View>
          )}

          <TouchableOpacity
            style={styles.attachButton}
            onPress={handleAttachmentPress}
          >
            <Icon name="attach-file" size={24} color="#667eea" />
            <Text style={styles.attachButtonText}>Attach Files</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Icon name="send" size={24} color="#fff" />
            <Text style={styles.sendButtonText}>Send Message</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Attachment Modal */}
      <Modal
        visible={showAttachmentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAttachmentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Attachment Type</Text>

            <TouchableOpacity style={styles.modalOption} onPress={handlePhotoAttachment}>
              <Icon name="photo" size={24} color="#667eea" />
              <Text style={styles.modalOptionText}>Photos</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={handleVideoAttachment}>
              <Icon name="videocam" size={24} color="#667eea" />
              <Text style={styles.modalOptionText}>Videos</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={handleMusicAttachment}>
              <Icon name="music-note" size={24} color="#667eea" />
              <Text style={styles.modalOptionText}>Music</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={handleDocumentAttachment}>
              <Icon name="description" size={24} color="#667eea" />
              <Text style={styles.modalOptionText}>Documents</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={handleContactAttachment}>
              <Icon name="person" size={24} color="#667eea" />
              <Text style={styles.modalOptionText}>Contacts</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalOption, styles.cancelOption]}
              onPress={() => setShowAttachmentModal(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Contacts Modal */}
      <Modal
        visible={showContactsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowContactsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Contact</Text>
            <FlatList
              data={contacts}
              renderItem={renderContact}
              keyExtractor={(item, index) => index.toString()}
              style={styles.contactsList}
            />
            <TouchableOpacity
              style={[styles.modalOption, styles.cancelOption]}
              onPress={() => setShowContactsModal(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Spinner
        visible={loading}
        textContent={'Sending message...'}
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
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  messageInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  attachmentsContainer: {
    marginBottom: 15,
  },
  attachmentsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  attachmentText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#667eea',
    marginBottom: 20,
  },
  attachButtonText: {
    color: '#667eea',
    fontSize: 16,
    marginLeft: 10,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 8,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalOptionText: {
    fontSize: 16,
    marginLeft: 15,
    color: '#333',
  },
  cancelOption: {
    justifyContent: 'center',
    borderBottomWidth: 0,
    marginTop: 10,
  },
  cancelText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
  },
  contactsList: {
    maxHeight: 300,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  contactInfo: {
    marginLeft: 15,
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  contactEmail: {
    fontSize: 14,
    color: '#666',
  },
  spinnerText: {
    color: '#FFF',
  },
});

export default SendScreen;