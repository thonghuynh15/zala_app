import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Image,
  Alert,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
  StatusBar
} from "react-native";
import { fetchConversations, fetchMessages, uploadFile } from "../services/chatService";
import { getProfile } from "../services/authService";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { MaterialIcons, Ionicons, FontAwesome } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { baseUrl } from "../utils/config";

import axios from 'axios';
import { ToastAndroid } from 'react-native';

// Các định dạng file được hỗ trợ
const ALLOWED_EXTENSIONS = /\.(jpg|jpeg|png|gif|pdf|docx|xlsx|txt|zip|rar)$/i;

const ChatScreen = ({ route, navigation }) => {
  console.log('ChatScreen params:', route.params);

  const { conversation } = route.params || {};
  
  // Bảo vệ nếu không có conversation
  if (!conversation) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Không tìm thấy cuộc trò chuyện</Text>
      </View>
    );
  }

  const themeColor = conversation?.theme || '#0078FF';
  const friendName = conversation?.friendName || 'Bạn bè';

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [image, setImage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardMessage, setForwardMessage] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMessageOptions, setShowMessageOptions] = useState(false);
  
  const socketRef = useRef(null);
  const flatListRef = useRef();

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const tokensString = await AsyncStorage.getItem('tokens');
        if (!tokensString) {
          navigation.replace('Login');
          return;
        }
        
        const tokens = JSON.parse(tokensString);
        const response = await axios.get(`${baseUrl}/auth/user`, {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        });
        
        setCurrentUser(response.data.username);
    } catch (error) {
        console.error('Error fetching user info:', error);
        AsyncStorage.removeItem('tokens');
        navigation.replace('Login');
    }
  };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const setupSocket = async () => {
      const tokensString = await AsyncStorage.getItem('tokens');
      const tokens = JSON.parse(tokensString);
      
      socketRef.current = io(baseUrl.replace('/api', ''), {
        auth: { token: tokens.accessToken },
      });

      socketRef.current.on('connect', () => {
        console.log('Socket.IO connected');
        socketRef.current.emit('joinConversation', {
          conversationId: conversation.conversationId,
        });
      });

      socketRef.current.on('receiveMessage', async (message) => {
        if (
          message.conversationId === conversation.conversationId &&
          !messages.some(
            (msg) =>
          msg.timestamp === message.timestamp && 
          msg.senderId === message.senderId && 
          msg.content === message.content
          )
        ) {
          let updatedMessage = message;
          if (message.forwardedFrom) {
            const forwardedName = await getFriendName(message.forwardedFrom);
            updatedMessage = { ...message, forwardedName };
          }
          
          setMessages((prevMessages) => [...prevMessages, updatedMessage]);
          if (typeof fetchConversations === 'function') fetchConversations();
        }
      });

      socketRef.current.on('messageRecalled', ({ conversationId, timestamp }) => {
        if (conversation.conversationId === conversationId) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.timestamp === timestamp
                ? { ...msg, type: 'recalled', status: 'recalled' }
                : msg
            )
          );
          showToast('Tin nhắn đã được thu hồi thành công!');
        }
      });

      socketRef.current.on('messageDeleted', ({ conversationId, timestamp }) => {
        if (conversation.conversationId === conversationId) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.timestamp === timestamp ? { ...msg, status: 'deleted' } : msg
            )
          );
          showToast('Tin nhắn đã được xóa thành công!');
        }
      });
    };

    setupSocket();
    fetchMessages();
    fetchConversations();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [currentUser, conversation]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const tokensString = await AsyncStorage.getItem('tokens');
      const tokens = JSON.parse(tokensString);
      
      const response = await axios.get(
        `${baseUrl}/chats/messages/${conversation.conversationId}`,
        {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        }
      );
      
      const updatedMessages = await Promise.all(
        response.data.map(async (msg) => {
          if (msg.forwardedFrom && !msg.forwardedName) {
            const forwardedName = await getFriendName(msg.forwardedFrom);
            return { ...msg, forwardedName };
          }
          return msg;
        })
      );
      
      setMessages(updatedMessages);
      setLoading(false);
      showToast('Không thể tải tin nhắn');
    } catch (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
      showToast('Không thể tải tin nhắn');
    }
  };

  const fetchConversations = async () => {
    try {
      const tokensString = await AsyncStorage.getItem('tokens');
      const tokens = JSON.parse(tokensString);
      
      const response = await axios.get(`${baseUrl}/chats/conversations`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
      
      const updatedConversations = await Promise.all(
        response.data.map(async (conv) => {
          const theme = await AsyncStorage.getItem(`theme_${conv.conversationId}`);
          const nickname = await AsyncStorage.getItem(`nickname_${conv.conversationId}`);
          
          return {
            ...conv,
            theme: theme || conv.theme,
            friendName: nickname || conv.friendName,
          };
        })
      );
      
      setConversations(updatedConversations.filter(
        conv => conv.conversationId !== conversation.conversationId
      ));

      const friendMap = {};
      updatedConversations.forEach((conv) => {
        friendMap[conv.friendId] = conv.friendName;
      });
      
      setUserNames(prev => ({ ...prev, ...friendMap }));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const getFriendName = async (userId) => {
    if (userNames[userId]) return userNames[userId];

    const conv = conversations.find(c => c.friendId === userId);
    if (conv) {
      setUserNames(prev => ({ ...prev, [userId]: conv.friendName }));
      return conv.friendName;
    }

    try {
      const tokensString = await AsyncStorage.getItem('tokens');
      const tokens = JSON.parse(tokensString);
      
      const response = await axios.get(`${baseUrl}/auth/user/${userId}`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
      
      const name = response.data.name || response.data.username || userId;
      setUserNames(prev => ({ ...prev, [userId]: name }));
      return name;
      } catch (error) {
      console.error(`Error fetching user name ${userId}:`, error);
      return userId;
    }
  };

  const showToast = (message) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('Thông báo', message, [{ text: 'OK' }], { cancelable: true });
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !image) || isSending) return;

    setIsSending(true);
    
    let messageContent = newMessage;
    let messageType = 'text';

    if (image) {
      try {
        const tokensString = await AsyncStorage.getItem('tokens');
        const tokens = JSON.parse(tokensString);
        
        // Prepare form data
        const formData = new FormData();
        formData.append('file', {
          uri: image,
          type: 'image/jpeg',
          name: 'image.jpg',
        });

        // Upload file
        const response = await axios.post(
          `${baseUrl}/upload`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${tokens.accessToken}`,
            },
          }
        );
        
        messageContent = response.data.fileUrl;
        messageType = 'image';
      } catch (error) {
        console.error('Error uploading image:', error);
        showToast('Không thể tải ảnh lên');
        setIsSending(false);
        return;
      }
    }
    
    const message = {
      conversationId: conversation.conversationId,
      senderId: currentUser,
      receiverId: conversation.friendId,
      content: messageContent,
      type: messageType,
      timestamp: new Date().toISOString(),
    };
    
    if (socketRef.current) {
      socketRef.current.emit('sendMessage', message);
    }

    setMessages((prev) => [...prev, { ...message, status: 'sent' }]);
    setNewMessage('');
    setImage(null);
    setIsSending(false);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      showToast('Cần quyền truy cập thư viện ảnh');
      return;
    }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
      aspect: [4, 3],
        quality: 0.8,
      });
      
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleLongPressMessage = (message) => {
    if (message.senderId === currentUser && 
        message.status !== 'deleted' && 
        message.type !== 'recalled') {
      setSelectedMessage(message);
      setShowMessageOptions(true);
    }
  };

  const handleRecallMessage = () => {
    if (!selectedMessage) return;
    
    Alert.alert(
      'Thu hồi tin nhắn',
      'Bạn có chắc chắn muốn thu hồi tin nhắn này?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
          onPress: () => setShowMessageOptions(false),
        },
        {
          text: 'Thu hồi',
          style: 'destructive',
          onPress: () => {
            socketRef.current.emit('recallMessage', {
              conversationId: conversation.conversationId,
              timestamp: selectedMessage.timestamp,
            });
            setShowMessageOptions(false);
          },
        },
      ]
    );
  };

  const handleDeleteMessage = () => {
    if (!selectedMessage) return;
    
    Alert.alert(
      'Xóa tin nhắn',
      'Bạn có chắc chắn muốn xóa tin nhắn này?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
          onPress: () => setShowMessageOptions(false),
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            socketRef.current.emit('deleteMessage', {
              conversationId: conversation.conversationId,
              timestamp: selectedMessage.timestamp,
            });
            setShowMessageOptions(false);
          },
        },
      ]
    );
  };

  const handleForwardMessage = () => {
    if (!selectedMessage) return;
    
    if (conversations.length === 0) {
      showToast('Không có cuộc trò chuyện nào khác để chuyển tiếp!');
      setShowMessageOptions(false);
      return;
    }
    
    setForwardMessage(selectedMessage);
    setShowForwardModal(true);
    setShowMessageOptions(false);
  };

  const handleForwardToConversation = (targetConversation) => {
    socketRef.current.emit('forwardMessage', {
      conversationId: conversation.conversationId,
      newConversationId: targetConversation.conversationId,
      content: forwardMessage.content,
      type: forwardMessage.type,
      forwardedFrom: forwardMessage.senderId,
    });
    
    showToast(`Đã chuyển tiếp tin nhắn tới ${targetConversation.friendName}`);
    setShowForwardModal(false);
    setForwardMessage(null);
  };

  const renderMessageItem = ({ item }) => {
    const isOwnMessage = item.senderId === currentUser;
    
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={() => handleLongPressMessage(item)}
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isOwnMessage ? 
              [styles.ownMessageBubble, { backgroundColor: themeColor }] : 
              styles.otherMessageBubble
          ]}
        >
          {item.status === 'deleted' ? (
            <Text style={styles.deletedMessage}>Tin nhắn đã bị xóa</Text>
          ) : item.type === 'recalled' ? (
            <Text style={styles.recalledMessage}>Tin nhắn đã được thu hồi</Text>
          ) : (
            <>
              <Text style={styles.senderName}>
                {isOwnMessage ? 'Bạn' : friendName}
              </Text>
              
          {item.forwardedFrom && (
                <Text style={styles.forwardedText}>
                  Chuyển tiếp từ: {item.forwardedName || item.forwardedFrom}
                </Text>
              )}
              
              {item.type === 'image' ? (
                <Image 
              source={{ uri: item.content }}
                  style={styles.imageMessage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={[
                  styles.messageText,
                  isOwnMessage ? styles.ownMessageText : styles.otherMessageText
                ]}>
                  {item.content}
                </Text>
              )}
              
              <Text style={styles.timestamp}>
                {new Date(item.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderForwardItem = ({ item }) => (
    <TouchableOpacity
      style={styles.forwardItem}
      onPress={() => handleForwardToConversation(item)}
    >
      <View style={[styles.forwardAvatar, { backgroundColor: item.theme || '#0078FF' }]}>
        <Text style={styles.forwardAvatarText}>
          {item.friendName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text style={styles.forwardName}>{item.friendName}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      <View style={styles.appBar}>
        <TouchableOpacity style={styles.appBarBack} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.appBarTitle} numberOfLines={1}>{friendName}</Text>
        <View style={{ width: 40 }} />
      </View>
      {/* Messages */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0078FF" />
        </View>
      ) : (
      <FlatList
        ref={flatListRef}
        data={messages}
          renderItem={renderMessageItem}
          keyExtractor={(item, index) => `${item.timestamp}-${index}`}
        contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: true });
            }
          }}
          refreshing={loading}
          onRefresh={fetchMessages}
        />
      )}

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.inputContainer}
      >
        {image && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: image }} style={styles.imagePreview} />
            <TouchableOpacity 
              style={styles.removeImageButton}
              onPress={() => setImage(null)}
            >
              <Ionicons name="close-circle" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      )}
      
        <View style={styles.inputRow}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={handlePickImage}
          >
            <Ionicons name="image-outline" size={24} color="#666" />
          </TouchableOpacity>
          
        <TextInput
            style={styles.textInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Nhập tin nhắn..."
          multiline
        />
          
          <TouchableOpacity 
            style={[
              styles.sendButton,
              { backgroundColor: themeColor },
              (!newMessage.trim() && !image) ? styles.sendButtonDisabled : {}
            ]}
            onPress={handleSendMessage}
            disabled={(!newMessage.trim() && !image) || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
        </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      
      {/* Message Options Modal */}
      <Modal
        visible={showMessageOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMessageOptions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMessageOptions(false)}
        >
          <View style={styles.messageOptionsContainer}>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={handleRecallMessage}
            >
              <MaterialIcons name="replay" size={22} color="#333" />
              <Text style={styles.optionText}>Thu hồi tin nhắn</Text>
              </TouchableOpacity>
              
            <TouchableOpacity
              style={styles.optionButton}
              onPress={handleDeleteMessage}
            >
              <MaterialIcons name="delete" size={22} color="#FF3B30" />
              <Text style={[styles.optionText, { color: '#FF3B30' }]}>Xóa tin nhắn</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
              style={styles.optionButton}
              onPress={handleForwardMessage}
              >
              <MaterialIcons name="forward" size={22} color="#333" />
              <Text style={styles.optionText}>Chuyển tiếp tin nhắn</Text>
              </TouchableOpacity>
            </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Forward Modal */}
      <Modal
        visible={showForwardModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowForwardModal(false);
          setForwardMessage(null);
        }}
      >
        <View style={styles.forwardModalContainer}>
          <View style={styles.forwardModalContent}>
            <View style={styles.forwardModalHeader}>
              <Text style={styles.forwardModalTitle}>Chọn cuộc trò chuyện</Text>
                  <TouchableOpacity 
                    onPress={() => {
                  setShowForwardModal(false);
                  setForwardMessage(null);
                    }}
                  >
                <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
            </View>
            
            {conversations.length > 0 ? (
              <FlatList
                data={conversations}
                renderItem={renderForwardItem}
                keyExtractor={(item) => item.conversationId}
                contentContainerStyle={styles.forwardList}
              />
            ) : (
              <View style={styles.emptyForwardContainer}>
                <Text style={styles.emptyForwardText}>
                  Không có cuộc trò chuyện nào khác
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  appBar: { flexDirection: 'row', alignItems: 'center', height: 120, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', paddingHorizontal: 8, elevation: 2, zIndex: 10 },
  appBarBack: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  appBarTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600', color: '#333' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 10,
    paddingTop: 56,
  },
  messageContainer: {
    marginVertical: 5,
    maxWidth: '80%',
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    padding: 10,
    maxWidth: '100%',
  },
  ownMessageBubble: {
    backgroundColor: '#0078FF',
  },
  otherMessageBubble: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  senderName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    color: '#fff',
  },
  forwardedText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 4,
    color: '#f0f0f0',
  },
  messageText: {
    fontSize: 15,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#333',
  },
  deletedMessage: {
    fontStyle: 'italic',
    color: '#999',
    fontSize: 14,
  },
  recalledMessage: {
    fontStyle: 'italic',
    color: '#999',
    fontSize: 14,
  },
  timestamp: {
    fontSize: 11,
    color: '#f0f0f0',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  imageMessage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginVertical: 5,
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    padding: 10,
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
  },
  removeImageButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#fff',
    borderRadius: 15,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageOptionsContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionText: {
    fontSize: 16,
    marginLeft: 15,
    color: '#333',
  },
  forwardModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  forwardModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 30,
    height: '60%',
  },
  forwardModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  forwardModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  forwardList: {
    paddingHorizontal: 20,
  },
  forwardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  forwardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  forwardAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  forwardName: {
    fontSize: 16,
    color: '#333',
  },
  emptyForwardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyForwardText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default ChatScreen;
