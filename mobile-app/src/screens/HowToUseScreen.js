import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Accordion from 'react-native-collapsible/Accordion';

const HowToUseScreen = () => {
  const [activeSections, setActiveSections] = useState([]);

  const faqs = [
    {
      title: 'Getting Started',
      content: [
        {
          question: 'How do I create an account?',
          answer: 'Tap the "Register" button on the login screen and fill in your username, email, and password. Make sure to use a strong password for security.'
        },
        {
          question: 'How do I reset my password?',
          answer: 'On the login screen, tap "Forgot Password?" and enter your email address. You\'ll receive a secure reset link via email.'
        },
        {
          question: 'Is my data secure?',
          answer: 'Yes! Cryptee uses end-to-end encryption for all messages and files. Your data is encrypted before transmission and can only be decrypted by authorized recipients.'
        }
      ]
    },
    {
      title: 'Sending Messages',
      content: [
        {
          question: 'How do I send a message?',
          answer: 'Go to the "Send" tab, enter the recipient\'s email address, type your message, and tap "Send Message".'
        },
        {
          question: 'Can I attach files to messages?',
          answer: 'Yes! Tap the "Attach Files" button to choose from photos, videos, music, documents, or contacts from your device.'
        },
        {
          question: 'How do I send a contact?',
          answer: 'When attaching files, select "Contacts" and choose a contact from your phone\'s address book. The contact information will be securely shared.'
        }
      ]
    },
    {
      title: 'Receiving Messages',
      content: [
        {
          question: 'Where do I see received messages?',
          answer: 'Go to the "Received" tab to view all messages sent to you. Unread messages are marked with a "New" badge.'
        },
        {
          question: 'How do I know if I have new messages?',
          answer: 'New messages show a "New" indicator in the message list. You can also check the notification badge on the app icon.'
        },
        {
          question: 'Can I reply to messages?',
          answer: 'Currently, you can only send new messages. Reply functionality will be added in future updates.'
        }
      ]
    },
    {
      title: 'File Management',
      content: [
        {
          question: 'What file types can I send?',
          answer: 'You can send photos, videos, music files, documents (PDF, Word, etc.), and contact information. Maximum file size is 50MB.'
        },
        {
          question: 'Are files encrypted?',
          answer: 'Yes! All files are encrypted before transmission and stored securely on the server. Only you and the recipient can access them.'
        },
        {
          question: 'How do I view attachments?',
          answer: 'Tap on any message with attachments to view the attachment details. You can download or open supported file types.'
        }
      ]
    },
    {
      title: 'Privacy & Security',
      content: [
        {
          question: 'Who can see my messages?',
          answer: 'Only you and the intended recipient can read your messages. Messages are encrypted end-to-end.'
        },
        {
          question: 'How does Cryptee protect my data?',
          answer: 'We use industry-standard encryption, secure authentication, and follow privacy best practices. Your data is never stored unencrypted.'
        },
        {
          question: 'Can I delete messages?',
          answer: 'Yes, you can delete any message from your history. Deleted messages are removed from your view but may still be visible to the recipient.'
        }
      ]
    },
    {
      title: 'Settings & Preferences',
      content: [
        {
          question: 'How do I change my language?',
          answer: 'Go to Settings > Language and select your preferred language from the available options.'
        },
        {
          question: 'How do I update my profile?',
          answer: 'Go to Settings > Profile to update your username, email, and profile picture.'
        },
        {
          question: 'How do I report a bug?',
          answer: 'Go to Settings > Report Bug to send us detailed information about any issues you encounter.'
        }
      ]
    }
  ];

  const tutorials = [
    {
      title: 'Welcome to Cryptee',
      description: 'Learn the basics of secure messaging',
      icon: 'school',
      steps: [
        'Create your account with a strong password',
        'Verify your email address',
        'Explore the main interface with Send/Received tabs',
        'Try sending your first message'
      ]
    },
    {
      title: 'Sending Files Securely',
      description: 'Share photos, documents, and more',
      icon: 'attach-file',
      steps: [
        'Go to the Send tab',
        'Enter recipient email',
        'Tap "Attach Files" to choose file type',
        'Select your file from device storage',
        'Add a message and send'
      ]
    },
    {
      title: 'Managing Your Messages',
      description: 'Organize and search your message history',
      icon: 'history',
      steps: [
        'Use the History tab to view all messages',
        'Search by sender, recipient, or content',
        'Filter by sent/received messages',
        'Delete unwanted messages'
      ]
    },
    {
      title: 'Privacy Settings',
      description: 'Control your privacy and security',
      icon: 'security',
      steps: [
        'Go to Settings for privacy options',
        'Enable biometric authentication if available',
        'Set up auto-logout for security',
        'Review and manage your contacts'
      ]
    }
  ];

  const renderTutorial = ({ item }) => (
    <View style={styles.tutorialCard}>
      <View style={styles.tutorialHeader}>
        <Icon name={item.icon} size={24} color="#667eea" />
        <View style={styles.tutorialTitleContainer}>
          <Text style={styles.tutorialTitle}>{item.title}</Text>
          <Text style={styles.tutorialDescription}>{item.description}</Text>
        </View>
      </View>
      <View style={styles.tutorialSteps}>
        {item.steps.map((step, index) => (
          <View key={index} style={styles.stepContainer}>
            <Text style={styles.stepNumber}>{index + 1}</Text>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderSectionHeader = (section, index, isActive) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
      <Icon
        name={isActive ? 'expand-less' : 'expand-more'}
        size={24}
        color="#667eea"
      />
    </View>
  );

  const renderSectionContent = (section) => (
    <View style={styles.sectionContent}>
      {section.content.map((faq, index) => (
        <View key={index} style={styles.faqItem}>
          <Text style={styles.faqQuestion}>{faq.question}</Text>
          <Text style={styles.faqAnswer}>{faq.answer}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Icon name="help" size={48} color="#667eea" />
        <Text style={styles.title}>How to Use Cryptee</Text>
        <Text style={styles.subtitle}>
          Learn everything you need to know about secure messaging
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Quick Tutorials</Text>
        <FlatList
          data={tutorials}
          renderItem={renderTutorial}
          keyExtractor={(item, index) => index.toString()}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        />

        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        <Accordion
          sections={faqs}
          activeSections={activeSections}
          renderSectionTitle={renderSectionHeader}
          renderHeader={renderSectionHeader}
          renderContent={renderSectionContent}
          onChange={setActiveSections}
          underlayColor="#f0f0f0"
        />

        <View style={styles.supportContainer}>
          <Text style={styles.supportTitle}>Need More Help?</Text>
          <Text style={styles.supportText}>
            If you can't find the answer you're looking for, our support team is here to help.
          </Text>
          <TouchableOpacity style={styles.supportButton}>
            <Icon name="email" size={20} color="#667eea" />
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#667eea',
    padding: 30,
    alignItems: 'center',
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#e8f4f8',
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginTop: 10,
  },
  tutorialCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tutorialHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  tutorialTitleContainer: {
    flex: 1,
    marginLeft: 15,
  },
  tutorialTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  tutorialDescription: {
    fontSize: 14,
    color: '#666',
  },
  tutorialSteps: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#667eea',
    color: '#fff',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 12,
    marginTop: 2,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  sectionHeader: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionContent: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  faqItem: {
    marginBottom: 15,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  supportContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  supportText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 20,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  supportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default HowToUseScreen;