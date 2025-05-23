import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { register, checkEmail } from "../services/authService";
import { useNavigation } from "@react-navigation/native";

const RegisterScreen = () => {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigation = useNavigation();

  const formatPhoneNumber = (phone) => {
    if (phone.startsWith("0")) {
      return "+84" + phone.slice(1);
    }
    return phone;
  };

  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(phone)) {
      setPhoneError("Số điện thoại không hợp lệ (bắt đầu bằng 0 và đủ 10 số).");
      return false;
    }
    setPhoneError("");
    return true;
  };

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

  const handleRegister = async () => {
    if (phoneError || emailError || isCheckingEmail) return;
    if (!validatePhoneNumber(phoneNumber)) return;

    setIsLoading(true);
    const formattedPhone = formatPhoneNumber(phoneNumber);

    try {
      const response = await register(email, password, name, formattedPhone);
      navigation.navigate("OTP", { username: response.username });
    } catch (error) {
      const errMsg = error.message?.toLowerCase();
      if (errMsg?.includes("phone") || errMsg?.includes("số điện thoại")) {
        setPhoneError("Số điện thoại đã được sử dụng hoặc không hợp lệ.");
      } else {
        Alert.alert("Lỗi", error.message || "Đăng ký thất bại");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const goToLogin = () => {
    navigation.navigate("Login");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Đăng ký</Text>

        <TextInput
          style={styles.input}
          placeholder="Họ tên"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <TextInput
          style={[styles.input, phoneError ? styles.inputError : null]}
          placeholder="Số điện thoại (VD: 0123456789)"
          value={phoneNumber}
          onChangeText={(text) => {
            setPhoneNumber(text);
            setPhoneError("");
          }}
          onBlur={() => validatePhoneNumber(phoneNumber)}
          keyboardType="phone-pad"
          maxLength={10}
        />
        {phoneError ? <Text style={styles.error}>{phoneError}</Text> : null}

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
        />
        {emailError ? <Text style={styles.error}>{emailError}</Text> : null}
        {isCheckingEmail ? (
          <Text style={styles.info}>Đang kiểm tra email...</Text>
        ) : null}

        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Mật khẩu"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
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

        <TouchableOpacity
          style={[
            styles.button,
            (isLoading || isCheckingEmail) && styles.buttonDisabled,
          ]}
          onPress={handleRegister}
          disabled={isLoading || isCheckingEmail}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isCheckingEmail ? "Vui lòng đợi..." : "Đăng ký"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={goToLogin}>
          <Text style={styles.secondaryButtonText}>
            Đã có tài khoản? Đăng nhập
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
    color: "#333",
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  inputError: {
    borderColor: "#ff3b30",
  },
  passwordContainer: {
    position: "relative",
    marginBottom: 15,
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
  secondaryButton: {
    width: "100%",
    height: 50,
    backgroundColor: "transparent",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  secondaryButtonText: {
    color: "#1E90FF",
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    color: "#ff3b30",
    fontSize: 14,
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 5,
  },
  info: {
    color: "#666",
    fontSize: 14,
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 5,
  },
});

export default RegisterScreen;
