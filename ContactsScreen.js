import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  fetchFriends,
  fetchFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
} from "../services/contactsService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import io from "socket.io-client";
import { baseUrl } from "../utils/config";

const SOCKET_URL = baseUrl.replace(/\/api$/, "");

const ContactsScreen = () => {
  const [emailInput, setEmailInput] = useState("");
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const socketRef = useRef(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [friendsData, requestsData] = await Promise.all([
        fetchFriends(),
        fetchFriendRequests(),
      ]);
      setFriends(friendsData || []);
      setFriendRequests(requestsData || []);
    } catch (e) {
      Alert.alert("Lỗi", "Không thể tải dữ liệu danh bạ");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const connectSocket = async () => {
      const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
      const accessToken = tokens?.accessToken;
      if (!accessToken) return;
      socketRef.current = io(SOCKET_URL, {
        auth: { token: accessToken },
        transports: ["websocket"],
      });
      socketRef.current.on("receiveFriendRequest", () => {
        if (isMounted) loadData();
      });
      socketRef.current.on("friendAdded", () => {
        if (isMounted) loadData();
      });
      socketRef.current.on("friendRemovedClient", () => {
        if (isMounted) loadData();
      });
    };
    connectSocket();
    return () => {
      isMounted = false;
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const handleAddFriend = async () => {
    if (!emailInput.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập email!");
      return;
    }
    setLoadingAction(true);
    try {
      await sendFriendRequest(emailInput.trim());
      Alert.alert("Thành công", "Đã gửi lời mời kết bạn!");
      setEmailInput("");
      loadData();
    } catch (e) {
      Alert.alert("Lỗi", "Không thể gửi lời mời kết bạn");
    }
    setLoadingAction(false);
  };

  const handleAccept = async (requestId) => {
    setLoadingAction(true);
    try {
      await acceptFriendRequest(requestId);
      loadData();
    } catch (e) {
      Alert.alert("Lỗi", "Không thể chấp nhận lời mời");
    }
    setLoadingAction(false);
  };

  const handleReject = async (requestId) => {
    setLoadingAction(true);
    try {
      await rejectFriendRequest(requestId);
      loadData();
    } catch (e) {
      Alert.alert("Lỗi", "Không thể từ chối lời mời");
    }
    setLoadingAction(false);
  };

  const handleRemoveFriend = async (friendId) => {
    setLoadingAction(true);
    try {
      await removeFriend(friendId);
      loadData();
    } catch (e) {
      Alert.alert("Lỗi", "Không thể hủy kết bạn");
    }
    setLoadingAction(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <View style={styles.container}>
        {/* AppBar */}
        <View style={styles.header}>
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={styles.headerTitle}>Danh bạ</Text>
          </View>
        </View>
        {/* Add friend */}
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            placeholder="Nhập email để kết bạn"
            value={emailInput}
            onChangeText={setEmailInput}
            editable={!loadingAction}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleAddFriend}
            disabled={loadingAction}
          >
            <Ionicons name="person-add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        {/* Friend Requests */}
        <Text style={styles.sectionTitle}>Lời mời kết bạn</Text>
        {loading ? (
          <ActivityIndicator
            style={{ marginVertical: 16 }}
            size="large"
            color="#0099FF"
          />
        ) : friendRequests.length === 0 ? (
          <Text style={styles.emptyText}>Không có lời mời kết bạn</Text>
        ) : (
          <FlatList
            data={friendRequests}
            keyExtractor={(item) =>
              item.requestId?.toString() || item.id?.toString()
            }
            renderItem={({ item }) => (
              <View style={styles.requestItem}>
                <Ionicons
                  name="person-circle"
                  size={40}
                  color="#bbb"
                  style={{ marginRight: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {item.senderName || item.senderId}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { backgroundColor: "#0099FF", marginRight: 8 },
                  ]}
                  onPress={() => handleAccept(item.requestId)}
                  disabled={loadingAction}
                >
                  <Text style={styles.actionText}>Chấp nhận</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#FF4C4C" }]}
                  onPress={() => handleReject(item.requestId)}
                  disabled={loadingAction}
                >
                  <Text style={styles.actionText}>Từ chối</Text>
                </TouchableOpacity>
              </View>
            )}
            style={{ marginBottom: 12 }}
          />
        )}
        {/* Friends List */}
        <Text style={styles.sectionTitle}>Danh sách bạn bè</Text>
        {loading ? (
          <ActivityIndicator
            style={{ marginVertical: 16 }}
            size="large"
            color="#0099FF"
          />
        ) : friends.length === 0 ? (
          <Text style={styles.emptyText}>Chưa có bạn bè</Text>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={(item) =>
              item.friendId?.toString() || item.id?.toString()
            }
            renderItem={({ item }) => (
              <View style={styles.friendItem}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {(item.friendName || item.friendId || "?")[0].toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.name}>
                  {item.friendName || item.friendId}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { backgroundColor: "#FF4C4C", marginLeft: "auto" },
                  ]}
                  onPress={() => handleRemoveFriend(item.friendId)}
                  disabled={loadingAction}
                >
                  <Text style={styles.actionText}>Hủy</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
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
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f7fafd",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  input: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 10,
  },
  addBtn: {
    backgroundColor: "#0099FF",
    borderRadius: 20,
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 18,
    marginBottom: 8,
    marginLeft: 18,
    color: "#222",
  },
  emptyText: {
    fontSize: 15,
    color: "#888",
    textAlign: "center",
    marginVertical: 10,
  },
  requestItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafd",
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    elevation: 1,
  },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafd",
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    elevation: 1,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0099FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
  },
  actionBtn: {
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 16,
    marginLeft: 6,
  },
  actionText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
});

export default ContactsScreen;
