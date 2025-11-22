import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
  Clipboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../context/AuthContext';

const InviteFriendsScreen = () => {
  const { user } = useAuth();
  const [invitationLink, setInvitationLink] = useState('');

  // Generate invitation link
  const generateInvitationLink = () => {
    const baseUrl = 'https://cryptee.app/invite';
    const inviteCode = generateInviteCode();
    return `${baseUrl}?ref=${inviteCode}&inviter=${user?.id || 'anonymous'}`;
  };

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleGenerateLink = () => {
    const link = generateInvitationLink();
    setInvitationLink(link);
  };

  const handleCopyLink = async () => {
    if (!invitationLink) {
      Alert.alert('Error', 'Please generate an invitation link first');
      return;
    }

    try {
      await Clipboard.setString(invitationLink);
      Alert.alert('Success', 'Invitation link copied to clipboard!');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy link');
    }
  };

  const handleShareLink = async () => {
    if (!invitationLink) {
      Alert.alert('Error', 'Please generate an invitation link first');
      return;
    }

    try {
      const result = await Share.share({
        message: `Join me on Cryptee - Secure Encrypted Messaging! Use my invitation link: ${invitationLink}`,
        url: invitationLink,
        title: 'Join Cryptee',
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share invitation link');
    }
  };

  const handleShareQR = async () => {
    if (!invitationLink) {
      Alert.alert('Error', 'Please generate an invitation link first');
      return;
    }

    try {
      // For QR code sharing, we'll share the link
      const result = await Share.share({
        message: `Scan this QR code or use this link to join Cryptee: ${invitationLink}`,
        url: invitationLink,
        title: 'Cryptee Invitation',
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share QR code');
    }
  };

  const inviteMethods = [
    {
      icon: 'link',
      title: 'Share Invitation Link',
      description: 'Generate and share a unique invitation link',
      onPress: handleGenerateLink,
      buttonText: 'Generate Link',
    },
    {
      icon: 'content-copy',
      title: 'Copy Link',
      description: 'Copy the invitation link to clipboard',
      onPress: handleCopyLink,
      buttonText: 'Copy',
      disabled: !invitationLink,
    },
    {
      icon: 'share',
      title: 'Share Link',
      description: 'Share the invitation link via messaging apps',
      onPress: handleShareLink,
      buttonText: 'Share',
      disabled: !invitationLink,
    },
    {
      icon: 'qr-code',
      title: 'QR Code',
      description: 'Generate QR code for easy scanning',
      onPress: handleShareQR,
      buttonText: 'Share QR',
      disabled: !invitationLink,
    },
  ];

  const renderInviteMethod = (method, index) => (
    <View key={index} style={styles.inviteMethod}>
      <View style={styles.methodHeader}>
        <Icon name={method.icon} size={24} color="#667eea" />
        <View style={styles.methodText}>
          <Text style={styles.methodTitle}>{method.title}</Text>
          <Text style={styles.methodDescription}>{method.description}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.methodButton, method.disabled && styles.methodButtonDisabled]}
        onPress={method.onPress}
        disabled={method.disabled}
      >
        <Text style={[styles.methodButtonText, method.disabled && styles.methodButtonTextDisabled]}>
          {method.buttonText}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Icon name="group-add" size={48} color="#667eea" />
        <Text style={styles.title}>Invite Friends</Text>
        <Text style={styles.subtitle}>
          Share Cryptee with your friends and help them discover secure messaging
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Invitation Methods</Text>

        {inviteMethods.map(renderInviteMethod)}

        {invitationLink ? (
          <View style={styles.linkContainer}>
            <Text style={styles.linkTitle}>Your Invitation Link:</Text>
            <Text style={styles.linkText} selectable={true}>
              {invitationLink}
            </Text>
          </View>
        ) : null}

        {invitationLink ? (
          <View style={styles.qrContainer}>
            <Text style={styles.qrTitle}>QR Code</Text>
            <Text style={styles.qrSubtitle}>Scan to join Cryptee</Text>
            <View style={styles.qrCode}>
              <QRCode
                value={invitationLink}
                size={150}
                color="#667eea"
                backgroundColor="#fff"
              />
            </View>
          </View>
        ) : null}

        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>Why invite friends?</Text>
          <View style={styles.benefit}>
            <Icon name="security" size={20} color="#28a745" />
            <Text style={styles.benefitText}>Help them discover secure messaging</Text>
          </View>
          <View style={styles.benefit}>
            <Icon name="group" size={20} color="#28a745" />
            <Text style={styles.benefitText}>Connect with friends in a private space</Text>
          </View>
          <View style={styles.benefit}>
            <Icon name="star" size={20} color="#28a745" />
            <Text style={styles.benefitText}>Earn rewards for successful invitations</Text>
          </View>
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  inviteMethod: {
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
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  methodText: {
    flex: 1,
    marginLeft: 15,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  methodButton: {
    backgroundColor: '#667eea',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
  },
  methodButtonDisabled: {
    backgroundColor: '#ccc',
  },
  methodButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  methodButtonTextDisabled: {
    color: '#999',
  },
  linkContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  linkText: {
    fontSize: 14,
    color: '#667eea',
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  qrContainer: {
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
  qrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  qrSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  qrCode: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  benefitsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
});

export default InviteFriendsScreen;