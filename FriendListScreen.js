import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
} from "react-native";
import { fetchConversations } from "../services/chatService";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

const FriendListScreen = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchConversations();
        setConversations(data || []);
      } catch (e) {
        setConversations([]);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const handleConversationPress = (conversation) => {
    navigation.navigate("Chat", { conversation });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0099FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trò chuyện</Text>
      </View>
      {conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={64}
            color="#bbb"
            style={{ marginBottom: 16 }}
          />
          <Text style={styles.emptyText}>Chưa có cuộc trò chuyện nào</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.conversationId}
          renderItem={({ item }) => {
            const isUnread = item.unread;
            const lastMessage = item.lastMessage;
            return (
              <TouchableOpacity
                style={styles.friendItem}
                onPress={() => handleConversationPress(item)}
              >
                <Image
                  source={{
                    uri: item.avatarUrl || "https://via.placeholder.com/50",
                  }}
                  style={styles.avatar}
                />
                <View style={styles.friendInfo}>
                  <Text
                    style={[
                      styles.name,
                      isUnread && { fontWeight: "bold", color: "#0078FF" },
                    ]}
                  >
                    {item.friendName}
                  </Text>
                  <Text
                    style={[
                      styles.lastMessage,
                      isUnread && { fontWeight: "bold", color: "#0078FF" },
                    ]}
                    numberOfLines={1}
                  >
                    {lastMessage
                      ? lastMessage.type === "image"
                        ? "Hình ảnh"
                        : lastMessage.type === "file"
                        ? "Tệp"
                        : lastMessage.content
                      : "Bắt đầu trò chuyện"}
                  </Text>
                </View>
                {isUnread && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    height: 64 + (Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    // Elevation for Android
    elevation: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 17,
    color: "#666",
    textAlign: "center",
    fontWeight: "500",
  },
  friendItem: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  friendInfo: {
    flex: 1,
    justifyContent: "center",
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: "#666",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0078FF",
    marginLeft: 8,
  },
});

export default FriendListScreen;
