import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { confirmOTP, sendOtpToEmail } from "../services/authService";
import { Ionicons } from "@expo/vector-icons";

const OTPScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const username = route.params?.username;
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!username) {
      Alert.alert("Lỗi", "Không tìm thấy thông tin người dùng");
      navigation.goBack();
    }
  }, [username, navigation]);

  useEffect(() => {
    let timer;
    if (resendDisabled && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setResendDisabled(false);
      setCountdown(60);
    }
    return () => clearInterval(timer);
  }, [resendDisabled, countdown]);

  const handleConfirm = async () => {
    if (!otpCode.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập mã OTP");
      return;
    }

    try {
      setLoading(true);
      await confirmOTP(username, otpCode);
      Alert.alert("Thành công", "Xác minh thành công", [
        {
          text: "OK",
          onPress: () =>
            navigation.reset({
              index: 0,
              routes: [{ name: "Login" }],
            }),
        },
      ]);
    } catch (error) {
      Alert.alert("Lỗi", error.message || "Xác minh thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setLoading(true);
      await sendOtpToEmail(username);
      setResendDisabled(true);
      Alert.alert("Thành công", "Mã OTP mới đã được gửi");
    } catch (error) {
      Alert.alert("Lỗi", error.message || "Không thể gửi lại mã OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1E90FF" />
          </TouchableOpacity>

          <Text style={styles.title}>Nhập mã OTP</Text>
          <Text style={styles.subtitle}>
            Mã xác minh đã được gửi đến {username}
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Nhập mã OTP"
              value={otpCode}
              onChangeText={setOtpCode}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              placeholderTextColor="#666"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Xác nhận</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.resendButton,
              resendDisabled && styles.resendButtonDisabled,
            ]}
            onPress={handleResendOTP}
            disabled={resendDisabled || loading}
          >
            <Text
              style={[
                styles.resendText,
                resendDisabled && styles.resendTextDisabled,
              ]}
            >
              {resendDisabled
                ? `Gửi lại mã sau ${countdown}s`
                : "Gửi lại mã xác minh"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    left: 20,
    zIndex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: "#000",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    color: "#666",
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 15,
    fontSize: 18,
    textAlign: "center",
    letterSpacing: 8,
    color: "#000",
  },
  button: {
    backgroundColor: "#1E90FF",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    marginBottom: 15,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  resendButton: {
    padding: 10,
    alignItems: "center",
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendText: {
    color: "#1E90FF",
    fontSize: 16,
  },
  resendTextDisabled: {
    color: "#666",
  },
});

export default OTPScreen;
