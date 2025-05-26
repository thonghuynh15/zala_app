import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import axios from "axios";
import io from "socket.io-client";
import { baseUrl, IP, PORT } from "../utils/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import GroupManagementScreen from "./GroupManagementScreen";
import * as ImagePicker from "expo-image-picker";
import { addMember, removeMember, dissolveGroup } from '../services/groupService';

const GroupsNative = () => {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [filePreviewType, setFilePreviewType] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showManagement, setShowManagement] = useState(false);
  const [userNames, setUserNames] = useState({});
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardMessage, setForwardMessage] = useState(null);
  const [theme, setTheme] = useState("light");
  const socketRef = useRef(null);
  const flatListRef = useRef(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [addMemberId, setAddMemberId] = useState('');
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [friends, setFriends] = useState([]);

  // Theme definitions simplified
  const themes = {
    light: {
      backgroundColor: "#f0f2f5",
      messageOwnColor: "#0078FF",
      messageOtherColor: "#ffffff",
      textColor: "#1a3c61",
      inputBackgroundColor: "#ffffff",
      borderColor: "#d1d9e6",
      headerBackgroundColor: "#f9fafb",
    },
    dark: {
      backgroundColor: "#18191a",
      messageOwnColor: "#0084ff",
      messageOtherColor: "#3a3b3c",
      textColor: "#e4e6eb",
      inputBackgroundColor: "#3a3b3c",
      borderColor: "#4a4b4c",
      headerBackgroundColor: "#242526",
    },
  };

  // Save theme to AsyncStorage
  useEffect(() => {
    const saveTheme = async () => {
      try {
        await AsyncStorage.setItem("chatTheme", theme);
      } catch (error) {
        console.error("Error saving theme:", error);
      }
    };
    saveTheme();
  }, [theme]);

  // Load theme from AsyncStorage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("chatTheme");
        if (savedTheme) {
          setTheme(savedTheme);
        }
      } catch (error) {
        console.error("Error loading theme:", error);
      }
    };
    loadTheme();
  }, []);

  // Fetch friend names to get friendName
  const fetchFriendNames = async () => {
    try {
      const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
      const response = await axios.get(`${baseUrl}/contacts/friends`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
      const friendMap = {};
      response.data.forEach((friend) => {
        friendMap[friend.friendId] = friend.friendName;
      });
      setUserNames((prev) => ({ ...prev, ...friendMap }));
      setFriends(response.data);
    } catch (error) {
      console.error("Error fetching friends:", error);
      Alert.alert("Error", "Could not fetch friends list");
    }
  };

  // Get sender name for senderId
  const getSenderName = (senderId) => {
    if (userNames[senderId]) {
      return userNames[senderId];
    }
    return senderId;
  };

  // Fetch friend names when group is selected
  useEffect(() => {
    if (!selectedGroup || !currentUser) return;
    fetchFriendNames();
  }, [selectedGroup, currentUser]);

  // Fetch user info
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
        if (!tokens?.accessToken) {
          console.log("No token found, redirecting to login");
          // Navigation would go here
          return;
        }

        const response = await axios.get(`${baseUrl}/auth/user`, {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        });
        setCurrentUser(response.data.username);
      } catch (error) {
        console.error("Error fetching user info:", error);
        Alert.alert("Error", "Could not fetch user information");
        // Navigation would go here
      }
    };

    fetchUserInfo();
  }, []);

  // Refresh groups list
  useEffect(() => {
    const refreshGroups = async () => {
      try {
        const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
        if (!tokens?.accessToken || !currentUser) return;

        setIsLoading(true);
        const response = await axios.get(`${baseUrl}/groups`, {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        });
        setGroups(response.data);
      } catch (error) {
        console.error(
          "Error refreshing groups:",
          error.response?.data || error.message
        );
        Alert.alert("Error", "Could not refresh groups list");
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser) {
      refreshGroups();
    }

    return () => {
      // Clean up if needed
    };
  }, [currentUser]);

  // Initialize Socket.IO
  useEffect(() => {
    const initializeSocket = async () => {
      try {
        const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
        if (!tokens?.accessToken || !currentUser) return;

        // Disconnect existing socket if any
        if (socketRef.current?.connected) {
          socketRef.current.disconnect();
        }

        socketRef.current = io("http://192.168.0.103:5000", {
          auth: { token: tokens.accessToken },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 2000,
          timeout: 20000,
          transports: ["websocket"],
          forceNew: true,
          path: "/socket.io",
          extraHeaders: {
            "Access-Control-Allow-Origin": "*",
          },
        });

        // Connection event handlers
        socketRef.current.on("connect", () => {
          console.log(
            "Socket.IO connected successfully with ID:",
            socketRef.current.id
          );
          if (groups.length > 0) {
            groups.forEach((group) => {
              socketRef.current.emit("joinGroup", { groupId: group.groupId });
            });
          }
        });

        socketRef.current.on("connect_error", (error) => {
          console.error("Socket.IO connection error details:", {
            message: error.message,
            description: error.description,
            type: error.type,
            transport: socketRef.current.io.engine.transport.name,
          });

          // Only show alert for specific error types
          if (
            error.message.includes("xhr poll error") ||
            error.message.includes("websocket error")
          ) {
            Alert.alert(
              "Connection Error",
              "Unable to establish connection. Please check your network and try again."
            );
          }
        });

        socketRef.current.on("error", (error) => {
          console.error("Socket.IO general error:", error);
        });

        socketRef.current.on("disconnect", (reason) => {
          console.log("Socket disconnected:", reason);
          if (reason === "io server disconnect") {
            // Server initiated disconnect, try to reconnect
            socketRef.current.connect();
          }
        });

        socketRef.current.on("reconnect", (attemptNumber) => {
          console.log("Socket reconnected after", attemptNumber, "attempts");
          if (groups.length > 0) {
            groups.forEach((group) => {
              socketRef.current.emit("joinGroup", { groupId: group.groupId });
            });
          }
        });

        socketRef.current.on("reconnect_error", (error) => {
          console.error("Socket reconnection error:", error);
        });

        socketRef.current.on("reconnect_failed", () => {
          console.error("Socket reconnection failed after all attempts");
          Alert.alert(
            "Connection Error",
            "Unable to reconnect to chat server. Please restart the app."
          );
        });

        socketRef.current.on("receiveGroupMessage", async (message) => {
          if (message.senderId === currentUser) {
            return;
          }
          if (messages.some((msg) => msg.messageId === message.messageId)) {
            return;
          }
          setMessages((prev) => [...prev, message]);
          if (message.groupId !== selectedGroup?.groupId) {
            const group = groups.find((g) => g.groupId === message.groupId);
       
          }
        });

        socketRef.current.on(
          "groupMessageRecalled",
          ({ groupId, timestamp }) => {
            if (groupId === selectedGroup?.groupId) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.timestamp === timestamp
                    ? { ...msg, type: "recalled", status: "recalled" }
                    : msg
                )
              );
              Alert.alert("Success", "Message has been recalled");
            }
          }
        );

        socketRef.current.on(
          "groupMessageDeleted",
          ({ groupId, timestamp }) => {
            if (groupId === selectedGroup?.groupId) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.timestamp === timestamp
                    ? { ...msg, status: "deleted" }
                    : msg
                )
              );
              Alert.alert("Success", "Message has been deleted");
            }
          }
        );

        socketRef.current.on("groupCreated", (group) => {
          setGroups((prev) => {
            if (prev.some((g) => g.groupId === group.groupId)) {
              return prev;
            }
            return [...prev, group];
          });
          Alert.alert("Group Created", `Group ${group.name} has been created!`);
        });

        socketRef.current.on(
          "groupUpdated",
          ({ groupId, newMember, removedMember, updatedMember, role }) => {
            setGroups((prev) =>
              prev.map((group) =>
                group.groupId === groupId
                  ? {
                      ...group,
                      members: newMember
                        ? [
                            ...group.members,
                            { userId: newMember, role: "member" },
                          ]
                        : removedMember
                        ? group.members.filter(
                            (m) => m.userId !== removedMember
                          )
                        : group.members.map((m) =>
                            m.userId === updatedMember ? { ...m, role } : m
                          ),
                    }
                  : group
              )
            );
            if (selectedGroup?.groupId === groupId) {
              setSelectedGroup((prev) => ({
                ...prev,
                members: newMember
                  ? [...prev.members, { userId: newMember, role: "member" }]
                  : removedMember
                  ? prev.members.filter((m) => m.userId !== removedMember)
                  : prev.members.map((m) =>
                      m.userId === updatedMember ? { ...m, role } : m
                    ),
              }));
            }
            const message = newMember
              ? `${
                  getUserName(newMember)
                } has been added to the group`
              : removedMember
              ? `${
                  getUserName(removedMember)
                } has left or been removed from the group`
              : `${getUserName(updatedMember)} is now ${
                  role === "admin" ? "an admin" : "a member"
                }`;
            Alert.alert("Group Update", message);
          }
        );

        socketRef.current.on("groupDissolved", ({ groupId }) => {
          setGroups((prev) =>
            prev.filter((group) => group.groupId !== groupId)
          );
          if (selectedGroup?.groupId === groupId) {
            setSelectedGroup(null);
            setMessages([]);
          }
          Alert.alert("Group Dissolved", "The group has been dissolved");
        });
      } catch (error) {
        console.error("Socket initialization error:", error);
        Alert.alert(
          "Error",
          "Failed to initialize chat connection. Please restart the app."
        );
      }
    };

    if (currentUser) {
      initializeSocket();
    }

    return () => {
      if (socketRef.current) {
        console.log("Cleaning up socket connection");
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [currentUser]);

  // Fetch group messages
  useEffect(() => {
    if (!selectedGroup) return;

    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
        const response = await axios.get(
          `${baseUrl}/groups/${selectedGroup.groupId}/messages`,
          {
            headers: { Authorization: `Bearer ${tokens.accessToken}` },
          }
        );
        setMessages(response.data);
      } catch (error) {
        console.error("Error fetching group messages:", error);
        Alert.alert("Error", "Could not fetch group messages");
      } finally {
        setIsLoading(false);
      }
    };

    if (socketRef.current) {
      socketRef.current.emit("joinGroup", { groupId: selectedGroup.groupId });
    }
    fetchMessages();
  }, [selectedGroup]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() && !file) return;

    let messageContent = newMessage;
    let messageType = "text";

    if (file) {
      const formData = new FormData();
      formData.append("file", {
        uri: file.uri,
        type: "image/jpeg",
        name: "image.jpg",
      });

      try {
        const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
        const response = await axios.post(`${baseUrl}/upload`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        });
        messageContent = response.data.fileUrl;
        messageType = "image";
      } catch (error) {
        console.error("Error uploading file:", error);
        Alert.alert("Error", "Could not upload file");
        return;
      }
    }

    const message = {
      groupId: selectedGroup.groupId,
      senderId: currentUser,
      content: messageContent,
      type: messageType,
      timestamp: new Date().toISOString(),
    };

    if (socketRef.current) {
      socketRef.current.emit("sendGroupMessage", message);
    }
    setMessages((prev) => [...prev, { ...message, status: "sent" }]);
    setNewMessage("");
    setFile(null);
    setFilePreview(null);
    setFilePreviewType(null);
  };

  // Select file
  const handleFileSelect = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Please grant permission to access your media library"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        allowsMultipleSelection: false,
      });

      if (!result.canceled) {
        const selectedAsset = result.assets[0];
        if (
          selectedAsset.fileSize &&
          selectedAsset.fileSize > 50 * 1024 * 1024
        ) {
          Alert.alert(
            "Error",
            "File too large, please select a file under 50MB"
          );
          return;
        }
        const file = {
          uri: selectedAsset.uri,
          type: selectedAsset.type || "image/jpeg",
          name: selectedAsset.uri.split("/").pop(),
          size: selectedAsset.fileSize || null,
        };
        setFile(file);
        setFilePreview(selectedAsset.uri);
        setFilePreviewType("image");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not select image");
    }
  };

  // Recall message
  const handleRecallMessage = (timestamp) => {
    Alert.alert(
      "Recall Message",
      "Are you sure you want to recall this message?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Recall",
          onPress: () => {
            if (socketRef.current) {
              socketRef.current.emit("recallGroupMessage", {
                groupId: selectedGroup.groupId,
                timestamp,
              });
            }
          },
        },
      ]
    );
  };

  // Delete message
  const handleDeleteMessage = (timestamp) => {
    Alert.alert(
      "Delete Message",
      "Are you sure you want to delete this message?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: () => {
            if (socketRef.current) {
              socketRef.current.emit("deleteGroupMessage", {
                groupId: selectedGroup.groupId,
                timestamp,
              });
            }
          },
        },
      ]
    );
  };

  // Open forward message modal
  const handleForwardMessage = (message) => {
    setForwardMessage(message);
    setShowForwardModal(true);
  };

  // Forward message to selected group
  const handleForwardToGroup = (newGroupId) => {
    if (!forwardMessage) return;
    if (socketRef.current) {
      socketRef.current.emit("forwardGroupMessage", {
        groupId: selectedGroup.groupId,
        newGroupId,
        content: forwardMessage.content,
        type: forwardMessage.type,
        forwardedFrom: forwardMessage.senderId,
      });
    }
    Alert.alert("Success", "Message has been forwarded");
    setShowForwardModal(false);
    setForwardMessage(null);
  };

  // Toggle theme
  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  // Add this function to check admin status
  const checkAdminStatus = () => {
    if (selectedGroup && currentUser) {
      const member = selectedGroup.members.find(m => m.userId === currentUser);
      setIsAdmin(member?.role === "admin");
    }
  };

  // Update useEffect for selectedGroup to check admin status
  useEffect(() => {
    if (selectedGroup) {
      checkAdminStatus();
    }
  }, [selectedGroup, currentUser]);

  // Sửa lại hàm remove member dùng groupService.js
  const handleRemoveMember = async (userId) => {
    if (!selectedGroup || !isAdmin) return;
    if (userId === currentUser) {
      Alert.alert("Lỗi", "Bạn không thể xóa chính mình");
      return;
    }

    Alert.alert(
      "Xóa thành viên",
      "Bạn có chắc chắn muốn xóa thành viên này khỏi nhóm?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await removeMember(selectedGroup.groupId, userId);
              setSelectedGroup(prev => ({
                ...prev,
                members: prev.members.filter(m => m.userId !== userId)
              }));
              if (socketRef.current) {
                socketRef.current.emit("groupUpdated", {
                  groupId: selectedGroup.groupId,
                  removedMember: userId
                });
              }
              Alert.alert("Thành công", "Đã xóa thành viên khỏi nhóm");
            } catch (error) {
              Alert.alert("Lỗi", "Không thể xóa thành viên");
            }
          }
        }
      ]
    );
  };

  // Sửa lại hàm giải tán nhóm dùng groupService.js
  const handleDissolveGroup = async () => {
    if (!selectedGroup || !isAdmin) return;

    Alert.alert(
      "Giải tán nhóm",
      "Bạn có chắc chắn muốn giải tán nhóm này? Hành động này không thể hoàn tác.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Giải tán",
          style: "destructive",
          onPress: async () => {
            try {
              await dissolveGroup(selectedGroup.groupId);
              if (socketRef.current) {
                socketRef.current.emit("groupDissolved", {
                  groupId: selectedGroup.groupId
                });
              }
              Alert.alert("Thành công", "Nhóm đã được giải tán");
              setSelectedGroup(null);
              setMessages([]);
            } catch (error) {
              Alert.alert("Lỗi", "Không thể giải tán nhóm");
            }
          }
        }
      ]
    );
  };

  // Hàm xử lý thêm thành viên
  const handleAddMember = async () => {
    if (!addMemberId.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập ID thành viên cần thêm");
      return;
    }
    setAddMemberLoading(true);
    try {
      await addMember(selectedGroup.groupId, addMemberId.trim());
      setSelectedGroup(prev => ({
        ...prev,
        members: [...prev.members, { userId: addMemberId.trim(), role: "member" }]
      }));
      if (socketRef.current) {
        socketRef.current.emit("groupUpdated", {
          groupId: selectedGroup.groupId,
          newMember: addMemberId.trim()
        });
      }
      Alert.alert("Thành công", "Đã thêm thành viên vào nhóm");
      setAddMemberId('');
    } catch (error) {
      Alert.alert("Lỗi", "Không thể thêm thành viên");
    }
    setAddMemberLoading(false);
  };

  // Hàm lấy tên từ userId
  const getUserName = (userId) => userNames[userId] || userId;

  // Hàm hiển thị tên thành viên nhóm
  const renderMemberName = (member) => {
    if (member.userId === currentUser && member.role === "admin") return "Bạn (Admin)";
    if (member.role === "admin") return getUserName(member.userId) + " (Admin)";
    return getUserName(member.userId);
  };

  // Render group item
  const renderGroupItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.groupItem,
        selectedGroup?.groupId === item.groupId && {
          backgroundColor: themes[theme].messageOwnColor + "20", // 20% opacity
        },
      ]}
      onPress={() => setSelectedGroup(item)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text style={[styles.groupName, { color: themes[theme].textColor }]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  // Render message item
  const renderMessageItem = ({ item }) => {
    const isOwnMessage = item.senderId === currentUser;
    const senderName = isOwnMessage ? "You" : getSenderName(item.senderId);

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage
            ? styles.messageContainerRight
            : styles.messageContainerLeft,
        ]}
      >
        <View
          style={[
            styles.messageContent,
            isOwnMessage
              ? {
                  backgroundColor: themes[theme].messageOwnColor,
                  borderColor: themes[theme].messageOwnColor,
                }
              : {
                  backgroundColor: themes[theme].messageOtherColor,
                  borderColor: themes[theme].borderColor,
                },
          ]}
        >
          <Text
            style={[
              styles.messageSender,
              { color: isOwnMessage ? "#fff" : themes[theme].textColor },
            ]}
          >
            {senderName}
          </Text>

          {item.status === "deleted" ? (
            <Text
              style={[
                styles.messageDeleted,
                {
                  color: isOwnMessage
                    ? "rgba(255,255,255,0.7)"
                    : themes[theme].textColor,
                },
              ]}
            >
              Message has been deleted
            </Text>
          ) : item.type === "recalled" ? (
            <Text
              style={[
                styles.messageDeleted,
                {
                  color: isOwnMessage
                    ? "rgba(255,255,255,0.7)"
                    : themes[theme].textColor,
                },
              ]}
            >
              Message has been recalled
            </Text>
          ) : item.type === "image" ? (
            <Image
              source={{ uri: item.content }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          ) : (
            <>
              <Text
                style={[
                  styles.messageText,
                  { color: isOwnMessage ? "#ffffff" : themes[theme].textColor },
                ]}
              >
                {item.content}
              </Text>

              {item.forwardedFrom && (
                <Text
                  style={[
                    styles.forwardedText,
                    {
                      color: isOwnMessage ? "rgba(255,255,255,0.7)" : "#6c757d",
                    },
                  ]}
                >
                  Forwarded from: {getSenderName(item.forwardedFrom)}
                </Text>
              )}
            </>
          )}

          <Text
            style={[
              styles.messageTime,
              { color: isOwnMessage ? "rgba(255,255,255,0.7)" : "#6c757d" },
            ]}
          >
            {new Date(item.timestamp).toLocaleTimeString()}
          </Text>

          {isOwnMessage &&
            item.status !== "deleted" &&
            item.type !== "recalled" && (
              <View style={styles.messageActions}>
                <TouchableOpacity
                  onPress={() => handleRecallMessage(item.timestamp)}
                  style={[styles.actionButton, { backgroundColor: "#e0e7ff" }]}
                >
                  <Text style={styles.actionButtonText}>Recall</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDeleteMessage(item.timestamp)}
                  style={[styles.actionButton, { backgroundColor: "#e0e7ff" }]}
                >
                  <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleForwardMessage(item)}
                  style={[styles.actionButton, { backgroundColor: "#e0e7ff" }]}
                >
                  <Text style={styles.actionButtonText}>Forward</Text>
                </TouchableOpacity>
              </View>
            )}
        </View>
      </View>
    );
  };

  // Render forward modal
  const renderForwardModal = () => (
    <Modal
      visible={showForwardModal}
      transparent
      animationType="slide"
      onRequestClose={() => {
        setShowForwardModal(false);
        setForwardMessage(null);
      }}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: themes[theme].backgroundColor },
          ]}
        >
          <Text style={[styles.modalTitle, { color: themes[theme].textColor }]}>
            Forward Message
          </Text>

          <ScrollView style={styles.modalContent}>
            {groups.length <= 1 ? (
              <Text
                style={[styles.emptyText, { color: themes[theme].textColor }]}
              >
                No other groups to forward to
              </Text>
            ) : (
              groups
                .filter((group) => group.groupId !== selectedGroup?.groupId)
                .map((group) => (
                  <TouchableOpacity
                    key={group.groupId}
                    style={styles.groupForwardItem}
                    onPress={() => handleForwardToGroup(group.groupId)}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {group.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.groupName,
                        { color: themes[theme].textColor },
                      ]}
                    >
                      {group.name}
                    </Text>
                  </TouchableOpacity>
                ))
            )}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.modalButton,
              { backgroundColor: themes[theme].messageOwnColor },
            ]}
            onPress={() => {
              setShowForwardModal(false);
              setForwardMessage(null);
            }}
          >
            <Text style={styles.modalButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Add Manage Modal component
  const renderManageModal = () => (
    <Modal
      visible={showManageModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowManageModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: themes[theme].backgroundColor }]}>
          <Text style={[styles.modalTitle, { color: themes[theme].textColor }]}>
            Quản lý nhóm
          </Text>
          
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Thành viên:</Text>
            {friends && friends.length > 0 && selectedGroup && selectedGroup.members ? friends.map(friend => {
              const member = selectedGroup.members.find(m => m.userId === friend.friendId);
              const isMember = !!member;
              const isAdmin = member?.role === 'admin';
              const isCurrentUser = friend.friendId === currentUser;
              return (
                <View key={friend.friendId} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, backgroundColor: '#f8fafd', borderRadius: 14, padding: 10 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#0078FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{friend.friendName[0]?.toUpperCase()}</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 15, color: '#1a3c61' }}>
                    {isCurrentUser && isAdmin ? 'Bạn (Admin)' : friend.friendName}
                    {isAdmin && !isCurrentUser && <Text style={{ color: '#0078FF' }}> (Admin)</Text>}
                  </Text>
                  {isMember ? (
                    isCurrentUser ? null : (
                      <>
                        {!isAdmin && (
                          <TouchableOpacity
                            style={{ backgroundColor: '#ff4d4f', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8 }}
                            onPress={() => handleRemoveMember(friend.friendId)}
                          >
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Xóa</Text>
                          </TouchableOpacity>
                        )}
                        {isAdmin && !isCurrentUser && (
                          <TouchableOpacity
                            style={{ backgroundColor: '#0078FF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8 }}
                            onPress={() => handleAssignAdmin(friend.friendId)}
                          >
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Gán Admin</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    )
                  ) : (
                    <TouchableOpacity
                      style={{ backgroundColor: '#28a745', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8 }}
                      onPress={async () => {
                        setAddMemberLoading(true);
                        try {
                          await addMember(selectedGroup.groupId, friend.friendId);
                          setSelectedGroup(prev => ({
                            ...prev,
                            members: [...prev.members, { userId: friend.friendId, role: 'member' }]
                          }));
                          if (socketRef.current) {
                            socketRef.current.emit('groupUpdated', {
                              groupId: selectedGroup.groupId,
                              newMember: friend.friendId
                            });
                          }
                          Alert.alert('Thành công', `Đã thêm ${friend.friendName} vào nhóm`);
                        } catch (error) {
                          Alert.alert('Lỗi', 'Không thể thêm thành viên');
                        }
                        setAddMemberLoading(false);
                      }}
                      disabled={addMemberLoading}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Thêm</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }) : (
              <Text style={{ color: '#888', fontStyle: 'italic' }}>Không có bạn bè để thêm</Text>
            )}
          </View>

          {isAdmin && (
            <TouchableOpacity
              style={[styles.dissolveButton, { backgroundColor: "#dc3545" }]}
              onPress={handleDissolveGroup}
            >
              <Text style={styles.buttonText}>Giải tán nhóm</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: themes[theme].messageOwnColor }]}
            onPress={() => setShowManageModal(false)}
          >
            <Text style={styles.buttonText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: themes[theme].backgroundColor },
      ]}
    >
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={themes[theme].headerBackgroundColor}
      />

      {!selectedGroup ? (
        // Groups list view
        <View style={styles.groupsContainer}>
          <View style={styles.header}>
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={styles.headerTitle}>Groups</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.createButton,
                { backgroundColor: themes[theme].messageOwnColor },
              ]}
              onPress={() => setShowManagement(true)}
              accessibilityLabel="Create Group"
              accessibilityRole="button"
            >
              <Text style={styles.createButtonText}>Create</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator
                size="large"
                color={themes[theme].messageOwnColor}
              />
            </View>
          ) : groups.length > 0 ? (
            <FlatList
              data={groups}
              renderItem={renderGroupItem}
              keyExtractor={(item) => item.groupId}
              contentContainerStyle={styles.groupsList}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text
                style={[styles.emptyText, { color: themes[theme].textColor }]}
              >
                No groups found
              </Text>
            </View>
          )}
        </View>
      ) : (
        // Chat view
        <View style={styles.chatContainer}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setSelectedGroup(null)}
              style={styles.backButton}
            >
              <Text style={{ fontSize: 22 }}>{"<"}</Text>
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>{selectedGroup.name}</Text>
            
            <TouchableOpacity
              onPress={() => setShowManageModal(true)}
              style={styles.manageButton}
              accessibilityLabel="Quản lý nhóm"
              accessibilityRole="button"
            >
              <Text style={styles.manageButtonText}>Quản lý</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator
                size="large"
                color={themes[theme].messageOwnColor}
              />
            </View>
          ) : messages.length > 0 ? (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessageItem}
              keyExtractor={(item, index) => item.messageId || index.toString()}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() =>
                flatListRef.current.scrollToEnd({ animated: true })
              }
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text
                style={[styles.emptyText, { color: themes[theme].textColor }]}
              >
                No messages yet
              </Text>
            </View>
          )}

          <View
            style={[
              styles.inputContainer,
              { backgroundColor: themes[theme].inputBackgroundColor },
            ]}
          >
            {file && (
              <View style={styles.previewContainer}>
                <Image
                  source={{ uri: filePreview }}
                  style={styles.previewImage}
                />
                <TouchableOpacity
                  style={styles.previewCloseButton}
                  onPress={() => {
                    setFile(null);
                    setFilePreview(null);
                  }}
                >
                  <Text style={styles.previewCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.attachButton,
                { borderColor: themes[theme].borderColor },
              ]}
              onPress={handleFileSelect}
            >
              <Text style={{ fontSize: 20 }}>📎</Text>
            </TouchableOpacity>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: themes[theme].inputBackgroundColor,
                  borderColor: themes[theme].borderColor,
                  color: themes[theme].textColor,
                },
              ]}
              placeholder="Type a message..."
              placeholderTextColor={theme === "dark" ? "#888" : "#aaa"}
              value={newMessage}
              onChangeText={setNewMessage}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: themes[theme].messageOwnColor },
              ]}
              onPress={handleSendMessage}
              disabled={!newMessage.trim() && !file}
            >
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showManagement && (
        <GroupManagementScreen
          group={selectedGroup}
          onClose={() => setShowManagement(false)}
          currentUser={currentUser}
          theme={theme}
        />
      )}

      {renderForwardModal()}
      {renderManageModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
  },
  groupsContainer: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
  },

  // Header styles
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    height: 64 + (Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0),
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
    textAlign: "center",
  },

  // Group item styles
  groupsList: {
    padding: 16,
  },
  groupItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0078FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  groupName: {
    fontSize: 16,
    fontWeight: "500",
  },

  // Message list styles
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: "80%",
  },
  messageContainerLeft: {
    alignSelf: "flex-start",
  },
  messageContainerRight: {
    alignSelf: "flex-end",
  },
  messageContent: {
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginVertical: 4,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  messageDeleted: {
    fontSize: 14,
    fontStyle: "italic",
  },
  forwardedText: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 4,
  },

  // Message actions
  messageActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 8,
  },
  actionButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 12,
    color: "#1a3c61",
  },

  // Input area
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: "#e0e7ff",
  },
  input: {
    flex: 1,
    height: 40,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 20,
    marginRight: 8,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    borderWidth: 1,
  },
  sendButton: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "500",
  },

  // File preview
  previewContainer: {
    position: "absolute",
    top: -80,
    left: 10,
    width: 70,
    height: 70,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e0e7ff",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewCloseButton: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewCloseText: {
    color: "#fff",
    fontSize: 12,
  },

  // Loading and empty states
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: "90%",
    maxHeight: "80%",
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    marginBottom: 8,
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    marginLeft: 12,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dissolveButton: {
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    alignItems: "center",
  },
  closeButton: {
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  modalContent: {
    maxHeight: 300,
  },

  // Create button styles
  createButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginLeft: 8,
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },

  // Manage button styles
  manageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#0078FF",
    marginLeft: 8,
  },
  manageButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // Back button styles
  backButton: {
    marginRight: 8,
    padding: 8,
  },
});

export default GroupsNative;
