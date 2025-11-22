import CryptoJS from 'crypto-js';

/**
 * Client-side encryption utilities for Cryptee
 * Uses AES-256 encryption for secure data transmission
 */

// Generate a random encryption key
export const generateEncryptionKey = () => {
  return CryptoJS.lib.WordArray.random(256/8).toString();
};

// Encrypt data using AES-256
export const encryptData = (data, key) => {
  try {
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

// Decrypt data using AES-256
export const decryptData = (encryptedData, key) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

// Hash password using SHA-256 (for additional client-side security)
export const hashPassword = (password) => {
  return CryptoJS.SHA256(password).toString();
};

// Generate a secure random salt
export const generateSalt = () => {
  return CryptoJS.lib.WordArray.random(128/8).toString();
};

// Create encrypted payload for API requests
export const createEncryptedPayload = (data, sessionKey = null) => {
  const key = sessionKey || generateEncryptionKey();
  const encryptedData = encryptData(data, key);

  return {
    encryptedData,
    key: key, // Always send the key for decryption
    timestamp: Date.now(),
    version: '1.0'
  };
};

// Decrypt API response
export const decryptApiResponse = (response, key) => {
  if (!response.encryptedData) {
    return response; // Not encrypted
  }

  return decryptData(response.encryptedData, key);
};

// Generate a session key for the current session
let sessionKey = null;
export const getSessionKey = () => {
  if (!sessionKey) {
    sessionKey = generateEncryptionKey();
  }
  return sessionKey;
};

// Reset session key (useful for logout)
export const resetSessionKey = () => {
  sessionKey = null;
};

// Encrypt sensitive form data before sending to API
export const encryptFormData = (formData) => {
  return createEncryptedPayload(formData, getSessionKey());
};

// Encrypt files before upload
export const encryptFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const fileData = event.target.result;
        const encrypted = encryptData(fileData, getSessionKey());
        resolve({
          encryptedData: encrypted,
          originalName: file.name,
          size: file.size,
          type: file.type,
          key: getSessionKey()
        });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

// Decrypt downloaded files
export const decryptFile = (encryptedData, key) => {
  try {
    return decryptData(encryptedData, key);
  } catch (error) {
    throw new Error('Failed to decrypt file');
  }
};

// Utility to check if data is encrypted
export const isEncrypted = (data) => {
  return typeof data === 'string' && data.length > 100; // Simple heuristic
};