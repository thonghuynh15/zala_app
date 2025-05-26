import { baseUrl } from "../utils/config";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const login = async (email, password) => {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: email, password }),
  });
  if (!response.ok) throw new Error("Login failed");
  const data = await response.json();
  await AsyncStorage.setItem("tokens", JSON.stringify(data));
  return data;
};

export const register = async (email, password, name, phoneNumber) => {
  const response = await fetch(`${baseUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name, phoneNumber }),
  });
  if (!response.ok) throw new Error("Register failed");
  return response.json();
};

export const forgotPassword = async (email) => {
  const response = await fetch(`${baseUrl}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: email }),
  });
  if (!response.ok) {
    let errorMsg = `Send code failed (status: ${response.status})`;
    try {
      const err = await response.json();
      errorMsg = err?.error || errorMsg;
    } catch (e) {
      errorMsg += " (no JSON body)";
    }
    console.log("ForgotPassword error:", errorMsg, response.status);
    throw new Error(errorMsg);
  }
  return response.json();
};

export const resetPassword = async (email, code, newPassword) => {
  const response = await fetch(`${baseUrl}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: email, code, newPassword }),
  });
  if (!response.ok) {
    let errorMsg = "Reset password failed";
    try {
      const err = await response.json();
      errorMsg = err?.error || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }
  return response.json();
};

export const getProfile = async () => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const response = await fetch(`${baseUrl}/auth/user`, {
    headers: { Authorization: `Bearer ${tokens?.accessToken}` },
  });
  if (!response.ok) throw new Error("Get profile failed");
  return response.json();
};

export const updateProfile = async (formData) => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const response = await fetch(`${baseUrl}/auth/update-user`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens?.accessToken}`,
    },
    body: formData,
  });
  if (!response.ok) throw new Error("Update profile failed");
  return response.json();
};

export const changePassword = async (oldPassword, newPassword) => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const response = await fetch(`${baseUrl}/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokens?.accessToken}`,
    },
    body: JSON.stringify({ oldPassword, newPassword }),
  });
  if (!response.ok) throw new Error("Change password failed");
  return response.json();
};

export const fetchConversations = async () => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const response = await fetch(`${baseUrl}/chats/conversations`, {
    headers: { Authorization: `Bearer ${tokens?.accessToken}` },
  });
  if (!response.ok) throw new Error("Fetch conversations failed");
  return response.json();
};

export const fetchMessages = async (conversationId) => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const response = await fetch(`${baseUrl}/chats/messages/${conversationId}`, {
    headers: { Authorization: `Bearer ${tokens?.accessToken}` },
  });
  if (!response.ok) throw new Error("Fetch messages failed");
  return response.json();
};

export const sendMessage = async (
  conversationId,
  receiverId,
  content,
  type
) => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const response = await fetch(`${baseUrl}/chats/send-message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokens?.accessToken}`,
    },
    body: JSON.stringify({
      conversationId,
      receiverId,
      content,
      type,
      timestamp: new Date().toISOString(),
    }),
  });
  if (!response.ok) throw new Error("Send message failed");
  return response.json();
};

// Upload a file
export const uploadFile = async (file) => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${baseUrl}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens?.accessToken}`,
      // 'Content-Type' will be set automatically by fetch when using FormData
    },
    body: formData,
  });
  if (!response.ok) throw new Error("Upload file failed");
  return response.json();
};

// Fetch all groups
export const fetchGroups = async () => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const response = await fetch(`${baseUrl}/groups`, {
    headers: { Authorization: `Bearer ${tokens?.accessToken}` },
  });
  if (!response.ok) throw new Error("Fetch groups failed");
  return response.json();
};

// Fetch messages for a group
export const fetchGroupMessages = async (groupId) => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const response = await fetch(`${baseUrl}/groups/${groupId}/messages`, {
    headers: { Authorization: `Bearer ${tokens?.accessToken}` },
  });
  if (!response.ok) throw new Error("Fetch group messages failed");
  return response.json();
};

// Create a new group
export const createGroup = async (name, memberIds) => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const response = await fetch(`${baseUrl}/groups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokens?.accessToken}`,
    },
    body: JSON.stringify({ name, memberIds }),
  });
  if (!response.ok) throw new Error("Create group failed");
  return response.json();
};

// Join a group (if needed)
export const joinGroup = async (groupId) => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const response = await fetch(`${baseUrl}/groups/${groupId}/join`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokens?.accessToken}` },
  });
  if (!response.ok) throw new Error("Join group failed");
  return response.json();
};

// Leave a group
export const leaveGroup = async (groupId) => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const response = await fetch(`${baseUrl}/groups/${groupId}/leave`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokens?.accessToken}` },
  });
  if (!response.ok) throw new Error("Leave group failed");
  return response.json();
};

// Send a group message (for REST fallback, use socket.io for real-time)
export const sendGroupMessage = async (groupId, content, type) => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const response = await fetch(`${baseUrl}/groups/${groupId}/send-message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokens?.accessToken}`,
    },
    body: JSON.stringify({
      content,
      type,
      timestamp: new Date().toISOString(),
    }),
  });
  if (!response.ok) throw new Error("Send group message failed");
  return response.json();
};

// Dissolve a group (admin only)
export const dissolveGroup = async (groupId) => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const response = await fetch(`${baseUrl}/groups/${groupId}/dissolve`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokens?.accessToken}` },
  });
  if (!response.ok) throw new Error("Dissolve group failed");
  return response.json();
};

// Fetch friends list
export const fetchFriends = async () => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const response = await fetch(`${baseUrl}/contacts/friends`, {
    headers: { Authorization: `Bearer ${tokens?.accessToken}` },
  });
  if (!response.ok) throw new Error("Fetch friends failed");
  return response.json();
};

// Fetch friend requests
export const fetchFriendRequests = async () => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const response = await fetch(`${baseUrl}/contacts/friend-requests`, {
    headers: { Authorization: `Bearer ${tokens?.accessToken}` },
  });
  if (!response.ok) throw new Error("Fetch friend requests failed");
  return response.json();
};

// Send a friend request
export const sendFriendRequest = async (receiverEmail) => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const response = await fetch(`${baseUrl}/contacts/send-friend-request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokens?.accessToken}`,
    },
    body: JSON.stringify({ receiverEmail }),
  });
  if (!response.ok) throw new Error("Send friend request failed");
  return response.json();
};

// Accept a friend request
export const acceptFriendRequest = async (requestId) => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const response = await fetch(`${baseUrl}/contacts/accept-friend-request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokens?.accessToken}`,
    },
    body: JSON.stringify({ requestId }),
  });
  if (!response.ok) throw new Error("Accept friend request failed");
  return response.json();
};

// Reject a friend request
export const rejectFriendRequest = async (requestId) => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const response = await fetch(`${baseUrl}/contacts/reject-friend-request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokens?.accessToken}`,
    },
    body: JSON.stringify({ requestId }),
  });
  if (!response.ok) throw new Error("Reject friend request failed");
  return response.json();
};

// Remove a friend
export const removeFriend = async (friendId) => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const response = await fetch(`${baseUrl}/contacts/remove-friend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokens?.accessToken}`,
    },
    body: JSON.stringify({ friendId }),
  });
  if (!response.ok) throw new Error("Remove friend failed");
  return response.json();
};

// Service for sending OTP via AWS (SES/SNS) or your backend
export const sendOtpToEmail = async (email) => {
  const response = await fetch(`${baseUrl}/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) throw new Error("Send OTP failed");
  return response.json();
};

// Check email validity using email verification API
export const checkEmail = async (email) => {
  if (!email) return { isValid: false, error: "Email is required" };

  try {
    const response = await fetch(
      "https://emailverification.whoisxmlapi.com/api/v3?" +
        new URLSearchParams({
          apiKey: "at_S5v4eJReK8lvCzihwR0bWZT9Uez8z", // ⚠️ Replace with real API key
          emailAddress: email,
        })
    );

    if (!response.ok) {
      throw new Error("Email verification service unavailable");
    }

    const data = await response.json();
    return {
      isValid: data.smtpCheck === "true",
      error:
        data.smtpCheck !== "true"
          ? "Email không tồn tại hoặc không hợp lệ."
          : null,
    };
  } catch (error) {
    console.error("Email verification error:", error);
    return {
      isValid: false,
      error: "Không thể kiểm tra email lúc này.",
    };
  }
};

export const confirmOTP = async (username, otpCode) => {
  const response = await fetch(`${baseUrl}/auth/confirm-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, otpCode }),
  });
  if (!response.ok) {
    let errorMsg = "Xác minh OTP thất bại";
    try {
      const err = await response.json();
      errorMsg = err?.error || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }
  return response.json();
};
