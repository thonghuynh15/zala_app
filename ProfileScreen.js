import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getProfile, updateProfile, uploadFile } from "../services/authService";
import { useNavigation } from "@react-navigation/native";

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState({
    name: "",
    phone: "",
    email: "",
    avatar: "https://i.pravatar.cc/150?img=8",
  });
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    avatar: "",
    avatarFile: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserInfo = async () => {
    try {
      setLoading(true);
      const response = await getProfile();
      const { attributes } = response;

      const userData = {
        name: attributes.name || "Chưa đặt tên",
        phone: attributes.phone_number || "Chưa có số điện thoại",
        email: attributes.email || "Chưa có email",
        avatar:
          attributes["custom:picture"] || "https://i.pravatar.cc/150?img=8",
      };

      setUser(userData);
      setFormData({
        name: userData.name,
        phone: userData.phone,
        email: userData.email,
        avatar: userData.avatar,
        avatarFile: null,
      });
      return userData;
    } catch (err) {
      setError(err.message || "Không thể tải thông tin người dùng");
      Alert.alert("Lỗi", err.message || "Không thể tải thông tin người dùng");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const handleEditToggle = () => {
    setEditMode(!editMode);
  };

  const handleInputChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleAvatarPick = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          "Cần quyền truy cập",
          "Vui lòng cho phép truy cập thư viện ảnh"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const file = {
          uri: result.assets[0].uri,
          type: "image/jpeg",
          name: "avatar.jpg",
        };
        setFormData({
          ...formData,
          avatar: result.assets[0].uri,
          avatarFile: file,
        });
      }
    } catch (err) {
      Alert.alert("Lỗi", "Không thể chọn ảnh");
    }
  };

  const handleUpdate = async () => {
    try {
      let formattedPhone = formData.phone;
      if (formattedPhone && formattedPhone.startsWith("0")) {
        formattedPhone = "+84" + formattedPhone.slice(1);
      }

      const phoneRegex = /^\+84\d{9}$/;
      if (!phoneRegex.test(formattedPhone)) {
        throw new Error(
          "Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại đúng định dạng."
        );
      }

      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("phone_number", formattedPhone);
      formDataToSend.append("email", formData.email);

      if (formData.avatarFile) {
        const uploadResponse = await uploadFile(formData.avatarFile);
        console.log("Avatar upload response:", uploadResponse);
        formDataToSend.append("picture", uploadResponse.url);
      }

      const updateResponse = await updateProfile(formDataToSend);

      const updatedUserData = await fetchUserInfo();

      setEditMode(false);
      Alert.alert("Thành công", "Cập nhật thông tin thành công");
    } catch (err) {
      console.error("Update profile error:", err);
      Alert.alert(
        "Lỗi",
        err.message || "Không thể cập nhật thông tin. Vui lòng thử lại."
      );
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("tokens");
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch (err) {
      Alert.alert("Lỗi", "Không thể đăng xuất. Vui lòng thử lại.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E90FF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Lỗi: {error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cá nhân</Text>
      </View>
      <ScrollView style={styles.container}>
        <View style={styles.card}>
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <TouchableOpacity
              onPress={editMode ? handleAvatarPick : null}
              disabled={!editMode}
              style={styles.avatarWrapper}
              accessibilityLabel="Thay đổi ảnh đại diện"
              accessibilityRole="imagebutton"
            >
              <Image
                source={{ uri: formData.avatar || user.avatar }}
                style={styles.avatar}
              />
              {editMode && (
                <View style={styles.editAvatarOverlay}>
                  <Text style={styles.editAvatarText}>🖼</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {editMode ? (
            <>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(value) => handleInputChange("name", value)}
                placeholder="Họ tên"
                placeholderTextColor="#666"
              />
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(value) => handleInputChange("phone", value)}
                placeholder="Số điện thoại"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
              />
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(value) => handleInputChange("email", value)}
                placeholder="Email"
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.button} onPress={handleUpdate}>
                <Text style={styles.buttonText}>Lưu</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleEditToggle}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.phone}>{user.phone}</Text>
              <Text style={styles.email}>{user.email}</Text>
              <TouchableOpacity
                style={styles.button}
                onPress={handleEditToggle}
              >
                <Text style={styles.buttonText}>Chỉnh sửa thông tin</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
              >
                <Text style={styles.buttonText}>Đăng xuất</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "red",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    margin: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  avatarWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#1E90FF",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
  },
  editAvatarOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#1E90FF",
    borderRadius: 16,
    padding: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  editAvatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#000",
  },
  phone: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
  },
  input: {
    width: "100%",
    height: 48,
    backgroundColor: "#f5f5f5",
    borderRadius: 24,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontSize: 16,
    color: "#000",
    borderWidth: 1,
    borderColor: "#e0e7eb",
  },
  button: {
    width: "100%",
    height: 48,
    backgroundColor: "#1E90FF",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButton: {
    width: "100%",
    height: 48,
    backgroundColor: "#ccc",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  cancelButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
  },
  logoutButton: {
    width: "100%",
    height: 48,
    backgroundColor: "#FF4C4C",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  header: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    height: 64 + (Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
    textAlign: "center",
    letterSpacing: 0.2,
  },
});

export default ProfileScreen;
