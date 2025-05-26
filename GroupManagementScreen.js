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
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { fetchFriends } from '../services/contactsService';
import {
  createGroup,
  addMember,
  removeMember,
  assignRole,
  dissolveGroup,
  joinGroup,
} from '../services/groupService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import { baseUrl } from '../utils/config';

const SOCKET_URL = baseUrl.replace(/\/api$/, '');

const GroupManagementScreen = ({ route, navigation, onClose }) => {
  const group = route?.params?.group || null;
  const currentUser = route?.params?.currentUser || null;
  const [groupName, setGroupName] = useState(group?.name || "");
  const [selectedMembers, setSelectedMembers] = useState(group?.members?.map(m => m.userId) || []);
  const [friends, setFriends] = useState([]);
  const [members, setMembers] = useState(group?.members || []);
  const [admins, setAdmins] = useState(group?.members?.filter(m => m.role === "admin").map(m => m.userId) || []);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const connectSocket = async () => {
      const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
      const accessToken = tokens?.accessToken;
      if (!accessToken) return;
      socketRef.current = io(SOCKET_URL, {
        transports: ["websocket"],
        query: { token: accessToken },
      });
      socketRef.current.on("groupUpdated", (data) => {
        if (isMounted) {
          // reload group info hoặc load lại members nếu cần
          if (group && data.groupId === group.groupId) {
            // Có thể reload lại members từ API nếu muốn realtime hơn
            // loadMembers();
          }
        }
      });
      socketRef.current.on("groupDissolved", (data) => {
        if (isMounted && group && data.groupId === group.groupId) {
          Alert.alert("Nhóm đã bị giải tán", "Bạn sẽ được chuyển về màn hình trước.", [
            { text: "OK", onPress: () => onClose && onClose() }
          ]);
        }
      });
    };
    connectSocket();
    return () => {
      isMounted = false;
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const data = await fetchFriends();
      setFriends(data || []);
    } catch (e) {
      Alert.alert("Lỗi", "Không thể tải danh sách bạn bè");
    }
    setLoading(false);
  };

  const handleToggleMember = (friendId) => {
    setSelectedMembers(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleAddMember = async (friendId) => {
    if (!group) return;
    if (selectedMembers.includes(friendId)) return;
    setLoading(true);
    try {
      await addMember(group.groupId, friendId);
      setSelectedMembers(prev => [...prev, friendId]);
      setMembers(prev => [...prev, { userId: friendId, role: "member" }]);
      if (socketRef.current) socketRef.current.emit("groupUpdated", { groupId: group.groupId, newMember: friendId });
    } catch (e) {
      Alert.alert("Lỗi", "Không thể thêm thành viên");
    }
    setLoading(false);
  };

  const handleRemoveMember = async (userId) => {
    if (!group) return;
    if (userId === currentUser) {
      Alert.alert("Lỗi", "Bạn không thể xóa chính mình");
      return;
    }
    setLoading(true);
    try {
      await removeMember(group.groupId, userId);
      setSelectedMembers(prev => prev.filter(id => id !== userId));
      setAdmins(prev => prev.filter(id => id !== userId));
      setMembers(prev => prev.filter(m => m.userId !== userId));
      if (socketRef.current) socketRef.current.emit("groupUpdated", { groupId: group.groupId, removedMember: userId });
    } catch (e) {
      Alert.alert("Lỗi", "Không thể xóa thành viên");
    }
    setLoading(false);
  };

  const handleAssignAdmin = async (userId) => {
    if (!group) return;
    if (userId === currentUser) {
      Alert.alert("Lỗi", "Bạn không thể tự gán quyền admin cho chính mình");
      return;
    }
    setLoading(true);
    try {
      await assignRole(group.groupId, userId, "admin");
      await assignRole(group.groupId, currentUser, "member");
      setAdmins([userId]);
      setMembers(prev =>
        prev.map(m =>
          m.userId === userId
            ? { ...m, role: "admin" }
            : m.userId === currentUser
            ? { ...m, role: "member" }
            : m
        )
      );
      if (socketRef.current) {
        socketRef.current.emit("groupUpdated", { groupId: group.groupId, updatedMember: userId, role: "admin" });
        socketRef.current.emit("groupUpdated", { groupId: group.groupId, updatedMember: currentUser, role: "member" });
      }
    } catch (e) {
      Alert.alert("Lỗi", "Không thể gán quyền admin");
    }
    setLoading(false);
  };

  const handleDissolveGroup = async () => {
    if (!group) return;
    setLoading(true);
    try {
      await dissolveGroup(group.groupId);
      if (socketRef.current) socketRef.current.emit("groupDissolved", { groupId: group.groupId });
      Alert.alert("Thành công", `Nhóm ${groupName} đã bị giải tán`);
      onClose && onClose();
    } catch (e) {
      Alert.alert("Lỗi", "Không thể giải tán nhóm");
    }
    setLoading(false);
  };

  const handleLeaveGroup = async () => {
    if (!group) return;
    setLoading(true);
    try {
      await removeMember(group.groupId, currentUser);
      if (socketRef.current) socketRef.current.emit("groupUpdated", { groupId: group.groupId, removedMember: currentUser });
      Alert.alert("Thành công", `Bạn đã rời nhóm ${groupName}`);
      onClose && onClose();
    } catch (e) {
      Alert.alert("Lỗi", "Không thể rời nhóm");
    }
    setLoading(false);
  };

  const handleSaveGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên nhóm");
      return;
    }
    if (selectedMembers.length === 0) {
      Alert.alert("Lỗi", "Vui lòng chọn ít nhất một thành viên");
      return;
    }
    setLoading(true);
    try {
      await createGroup(groupName, selectedMembers);
      Alert.alert("Thành công", `Nhóm ${groupName} đã được tạo!`);
      onClose && onClose();
    } catch (e) {
      Alert.alert("Lỗi", "Không thể tạo nhóm");
    }
    setLoading(false);
  };

  const isAdmin = members.find(m => m.userId === currentUser)?.role === "admin";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <View style={styles.container}>
        <View style={styles.appBar}>
          <Text style={styles.appBarTitle}>{group ? "Quản lý nhóm" : "Tạo nhóm mới"}</Text>
        </View>
        <FlatList
          data={friends}
          keyExtractor={item => item.friendId?.toString() || item.id?.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.memberItem}
              onPress={() => group ? handleAddMember(item.friendId) : handleToggleMember(item.friendId)}
              disabled={loading}
            >
              <View style={styles.memberAvatar}>
                <Text style={styles.avatarText}>{(item.friendName || item.friendId)[0]?.toUpperCase()}</Text>
              </View>
              <Text style={styles.memberName}>{item.friendName || item.friendId}</Text>
              {group && selectedMembers.includes(item.friendId) && <Text style={styles.addedText}>Đã thêm</Text>}
              {!group && selectedMembers.includes(item.friendId) && <Ionicons name="checkmark-circle" size={22} color="#0099FF" style={{ marginLeft: 8 }} />}
            </TouchableOpacity>
          )}
          ListHeaderComponent={
            <>
              <View style={{ padding: 16 }}>
                <Text style={styles.label}>Tên nhóm:</Text>
                <TextInput
                  style={styles.input}
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder="Nhập tên nhóm"
                  editable={!group}
                />
                <Text style={styles.label}>Thành viên:</Text>
                {loading && <ActivityIndicator style={{ marginVertical: 16 }} size="large" color="#0099FF" />}
                {!loading && friends.length === 0 && <Text style={styles.emptyText}>Không có bạn bè</Text>}
                {group && (
                  <>
                    <Text style={styles.label}>Thành viên nhóm:</Text>
                    {members.length === 0 ? (
                      <Text style={styles.emptyText}>Chưa có thành viên</Text>
                    ) : (
                      members.map(item => (
                        <View style={styles.memberItem} key={item.userId}>
                          <View style={styles.memberAvatar}>
                            <Text style={styles.avatarText}>{(item.userId || "?")[0]?.toUpperCase()}</Text>
                          </View>
                          <Text style={styles.memberName}>{item.userId}</Text>
                          {admins.includes(item.userId) && <Text style={styles.adminBadge}> (Admin)</Text>}
                          {isAdmin && item.userId !== currentUser && (
                            <>
                              <TouchableOpacity style={styles.actionBtn} onPress={() => handleRemoveMember(item.userId)}>
                                <Text style={styles.actionText}>Xóa</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionBtn} onPress={() => handleAssignAdmin(item.userId)}>
                                <Text style={styles.actionText}>Gán Admin</Text>
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      ))
                    )}
                  </>
                )}
                <View style={styles.buttonGroup}>
                  {group ? (
                    <>
                      <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveGroup} disabled={loading}>
                        <Text style={styles.btnText}>Rời Nhóm</Text>
                      </TouchableOpacity>
                      {isAdmin && (
                        <TouchableOpacity style={styles.dissolveBtn} onPress={handleDissolveGroup} disabled={loading}>
                          <Text style={styles.btnText}>Giải tán Nhóm</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  ) : (
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSaveGroup} disabled={loading}>
                      <Text style={styles.btnText}>{loading ? "Đang tạo..." : "Tạo Nhóm"}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => onClose && onClose()}>
                    <Text style={styles.btnText}>Hủy</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  appBar: {
    height: 60,
    backgroundColor: '#0099FF',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  appBarTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    color: '#222',
  },
  input: {
    backgroundColor: '#f0f0f0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    marginVertical: 10,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafd',
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    elevation: 1,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0099FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberName: {
    flex: 1,
    fontSize: 15,
    color: '#1a3c61',
  },
  adminBadge: {
    fontSize: 13,
    color: '#0078FF',
    fontWeight: '500',
  },
  addedText: {
    fontSize: 13,
    color: '#28a745',
    fontWeight: '500',
    marginLeft: 8,
  },
  actionBtn: {
    borderRadius: 10,
    backgroundColor: '#0078FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: 8,
  },
  actionText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 18,
    gap: 10,
  },
  saveBtn: {
    backgroundColor: '#0078FF',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginRight: 8,
  },
  leaveBtn: {
    backgroundColor: '#f39c12',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginRight: 8,
  },
  dissolveBtn: {
    backgroundColor: '#dc3545',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginRight: 8,
  },
  cancelBtn: {
    backgroundColor: '#6c757d',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    textAlign: 'center',
  },
});

export default GroupManagementScreen;
