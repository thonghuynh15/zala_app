import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  ScrollView,
  Alert,
  Linking,
  SafeAreaView,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { changePassword } from "../services/authService";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

const settingsOptions = [
  { id: "1", icon: "notifications", label: "Thông báo" },
  { id: "2", icon: "color-palette", label: "Chủ đề giao diện" },
  { id: "3", icon: "lock-closed", label: "Bảo mật" },
  { id: "4", icon: "help-circle", label: "Trợ giúp" },
  { id: "5", icon: "information-circle", label: "Thông tin ứng dụng" },
];

const notificationTimes = [
  "15 phút",
  "1 giờ",
  "4 giờ",
  "1 ngày",
  "Cho đến khi tôi bật lại",
];

const SettingsScreen = () => {
  const navigation = useNavigation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isNotificationOn, setIsNotificationOn] = useState(false);
  const [notificationTime, setNotificationTime] = useState("15 phút");
  const [isNotificationModalVisible, setIsNotificationModalVisible] =
    useState(false);
  const [isThemeModalVisible, setIsThemeModalVisible] = useState(false);
  const [isSecurityModalVisible, setIsSecurityModalVisible] = useState(false);
  const [isAppInfoModalVisible, setIsAppInfoModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedNotificationState = await AsyncStorage.getItem(
        "isNotificationOn"
      );
      const savedNotificationTime = await AsyncStorage.getItem(
        "notificationTime"
      );
      const savedThemeMode = await AsyncStorage.getItem("isDarkMode");

      setIsNotificationOn(savedNotificationState === "true");
      setNotificationTime(savedNotificationTime || "15 phút");
      setIsDarkMode(savedThemeMode === "true");
    } catch (err) {
      console.error("Error loading settings:", err);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem(
        "isNotificationOn",
        isNotificationOn.toString()
      );
      await AsyncStorage.setItem("notificationTime", notificationTime);
      await AsyncStorage.setItem("isDarkMode", isDarkMode.toString());
      setIsNotificationModalVisible(false);
      Alert.alert("Thành công", "Cài đặt đã được lưu");
    } catch (err) {
      Alert.alert("Lỗi", "Không thể lưu cài đặt");
    }
  };

  const handleOptionPress = (label) => {
    switch (label) {
      case "Thông báo":
        setIsNotificationModalVisible(true);
        break;
      case "Chủ đề giao diện":
        setIsThemeModalVisible(true);
        break;
      case "Bảo mật":
        setIsSecurityModalVisible(true);
        break;
      case "Trợ giúp":
        Linking.openURL("https://support.example.com");
        break;
      case "Thông tin ứng dụng":
        setIsAppInfoModalVisible(true);
        break;
      default:
        Alert.alert("Thông báo", "Chưa chọn tùy chọn nào");
    }
  };

  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword || !confirmNewPassword) {
      setError("Vui lòng điền đầy đủ thông tin.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("Mật khẩu mới và xác nhận mật khẩu không khớp.");
      return;
    }

    if (newPassword === oldPassword) {
      setError("Mật khẩu mới không thể giống mật khẩu cũ.");
      return;
    }

    try {
      await changePassword(oldPassword, newPassword);
      Alert.alert("Thành công", "Mật khẩu đã được thay đổi thành công.");
      setIsSecurityModalVisible(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setError("");
    } catch (err) {
      setError(err.message || "Đã xảy ra lỗi. Vui lòng thử lại.");
    }
  };

  const renderModal = (type) => {
    switch (type) {
      case "notification":
        return (
          <Modal
            animationType="slide"
            transparent={true}
            visible={isNotificationModalVisible}
            onRequestClose={() => setIsNotificationModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Tắt thông báo</Text>
                <Text style={styles.modalDescription}>
                  Tắt thông báo về đoạn chat này?
                </Text>

                {notificationTimes.map((time, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.timeOption,
                      notificationTime === time && styles.selectedTimeOption,
                    ]}
                    onPress={() => setNotificationTime(time)}
                  >
                    <Text
                      style={[
                        styles.timeOptionText,
                        notificationTime === time &&
                          styles.selectedTimeOptionText,
                      ]}
                    >
                      {time}
                    </Text>
                    {notificationTime === time && (
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}

                <View style={styles.switchContainer}>
                  <Text>Thông báo</Text>
                  <Switch
                    value={isNotificationOn}
                    onValueChange={setIsNotificationOn}
                    trackColor={{ false: "#ccc", true: "#4CAF50" }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setIsNotificationModalVisible(false)}
                  >
                    <Text style={styles.buttonText}>Đóng</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={saveSettings}
                  >
                    <Text style={styles.buttonText}>Lưu</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        );

      case "theme":
        return (
          <Modal
            animationType="slide"
            transparent={true}
            visible={isThemeModalVisible}
            onRequestClose={() => setIsThemeModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Chọn chủ đề giao diện</Text>
                <View style={styles.switchContainer}>
                  <Text>Chế độ tối</Text>
                  <Switch
                    value={isDarkMode}
                    onValueChange={setIsDarkMode}
                    trackColor={{ false: "#ccc", true: "#4CAF50" }}
                    thumbColor="#fff"
                  />
                </View>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={() => {
                    saveSettings();
                    setIsThemeModalVisible(false);
                  }}
                >
                  <Text style={styles.buttonText}>Đóng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        );

      case "security":
        return (
          <Modal
            animationType="slide"
            transparent={true}
            visible={isSecurityModalVisible}
            onRequestClose={() => setIsSecurityModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Cài đặt bảo mật</Text>
                <Text style={styles.modalDescription}>
                  Đổi mật khẩu của bạn.
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Mật khẩu cũ"
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  secureTextEntry
                />
                <TextInput
                  style={styles.input}
                  placeholder="Mật khẩu mới"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
                <TextInput
                  style={styles.input}
                  placeholder="Xác nhận mật khẩu mới"
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  secureTextEntry
                />

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setIsSecurityModalVisible(false);
                      setError("");
                      setOldPassword("");
                      setNewPassword("");
                      setConfirmNewPassword("");
                    }}
                  >
                    <Text style={styles.buttonText}>Đóng</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={handlePasswordChange}
                  >
                    <Text style={styles.buttonText}>Lưu thay đổi</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        );

      case "appInfo":
        return (
          <Modal
            animationType="slide"
            transparent={true}
            visible={isAppInfoModalVisible}
            onRequestClose={() => setIsAppInfoModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Thông tin ứng dụng</Text>
                <View style={styles.appInfoContainer}>
                  <Text style={styles.appInfoText}>
                    <Text style={styles.appInfoLabel}>Tên ứng dụng:</Text>{" "}
                    ZalaChat
                  </Text>
                  <Text style={styles.appInfoText}>
                    <Text style={styles.appInfoLabel}>Phiên bản:</Text> 1.1.1.1
                  </Text>
                  <Text style={styles.appInfoText}>
                    <Text style={styles.appInfoLabel}>Nhà phát triển:</Text>{" "}
                    Nhóm 7
                  </Text>
                  <Text style={styles.appInfoText}>
                    <Text style={styles.appInfoLabel}>Liên hệ:</Text>{" "}
                    support@chatapp.com
                  </Text>
                  <Text style={styles.appInfoText}>
                    <Text style={styles.appInfoLabel}>Mô tả:</Text> Ứng dụng trò
                    chuyện tiện lợi, an toàn và dễ sử dụng.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={() => setIsAppInfoModalVisible(false)}
                >
                  <Text style={styles.buttonText}>Đóng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <ScrollView style={[styles.container, isDarkMode && styles.darkContainer]}>
        <Text style={[styles.title, isDarkMode && styles.darkText]}>Cài đặt</Text>

        {settingsOptions.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.option, isDarkMode && styles.darkOption]}
            onPress={() => handleOptionPress(item.label)}
          >
            <Ionicons
              name={item.icon}
              size={24}
              color={isDarkMode ? "#fff" : "#1E90FF"}
              style={styles.optionIcon}
            />
            <Text style={[styles.optionLabel, isDarkMode && styles.darkText]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}

        {renderModal("notification")}
        {renderModal("theme")}
        {renderModal("security")}
        {renderModal("appInfo")}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  darkContainer: {
    backgroundColor: "#121212",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#000",
  },
  darkText: {
    color: "#fff",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  darkOption: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  optionIcon: {
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 16,
    color: "#000",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  modalDescription: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: "left",
  },
  timeOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#f5f5f5",
  },
  selectedTimeOption: {
    backgroundColor: "#1E90FF",
  },
  timeOptionText: {
    fontSize: 16,
    color: "#000",
  },
  selectedTimeOptionText: {
    color: "#fff",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: "#ccc",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
  },
  input: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
  },
  errorText: {
    color: "red",
    marginBottom: 12,
    textAlign: "center",
  },
  appInfoContainer: {
    marginBottom: 16,
  },
  appInfoText: {
    fontSize: 16,
    marginBottom: 8,
    lineHeight: 24,
  },
  appInfoLabel: {
    fontWeight: "bold",
  },
});

export default SettingsScreen;
