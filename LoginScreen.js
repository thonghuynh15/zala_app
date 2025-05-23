import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { login, checkEmail } from "../services/authService";

const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigation = useNavigation();

  const verifyEmailReal = async (emailToCheck) => {
    if (!emailToCheck) return;

    setIsCheckingEmail(true);
    setEmailError("");

    try {
      const result = await checkEmail(emailToCheck);
      if (!result.isValid) {
        setEmailError(result.error);
      }
    } catch (error) {
      console.error("Lỗi kiểm tra email:", error);
      setEmailError("Không thể kiểm tra email lúc này.");
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleLogin = async () => {
    if (emailError || isCheckingEmail) return;

    setIsLoading(true);
    try {
      const response = await login(email, password);
      // Token is automatically saved in AsyncStorage by the login service
      navigation.replace("MainTabs", { screen: "FriendList" });
    } catch (error) {
      Alert.alert(
        "Lỗi đăng nhập",
        error.response?.data?.error || "Đăng nhập thất bại. Vui lòng thử lại."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>ZalaChat</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, emailError ? styles.inputError : null]}
            placeholder="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setEmailError("");
            }}
            onBlur={() => verifyEmailReal(email)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />
          {emailError ? <Text style={styles.error}>{emailError}</Text> : null}
          {isCheckingEmail ? (
            <Text style={styles.info}>Đang kiểm tra email...</Text>
          ) : null}
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
              textContentType="password"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={24}
                color="#666"
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            (isLoading || isCheckingEmail) && styles.buttonDisabled,
          ]}
          onPress={handleLogin}
          disabled={isLoading || isCheckingEmail}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isCheckingEmail ? "Vui lòng đợi..." : "Đăng nhập"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          onPress={() => navigation.navigate("ForgotPassword")}
        >
          <Text style={styles.linkText}>Quên mật khẩu?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          onPress={() => navigation.navigate("Register")}
        >
          <Text style={styles.linkText}>Bạn chưa có tài khoản? Đăng ký</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 40,
    color: "#333",
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  inputError: {
    borderColor: "#ff3b30",
  },
  passwordContainer: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: "absolute",
    right: 15,
    top: 13,
  },
  button: {
    width: "100%",
    height: 50,
    backgroundColor: "#1E90FF",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  link: {
    marginTop: 15,
    alignItems: "center",
  },
  linkText: {
    color: "#1E90FF",
    fontSize: 14,
    textAlign: "center",
  },
  error: {
    color: "#ff3b30",
    fontSize: 14,
    marginTop: 5,
    marginLeft: 5,
  },
  info: {
    color: "#666",
    fontSize: 14,
    marginTop: 5,
    marginLeft: 5,
  },
});

export default LoginScreen;
