import { baseUrl } from "../utils/config";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const fetchGroups = async () => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const response = await fetch(`${baseUrl}/groups`, {
    headers: { Authorization: `Bearer ${tokens?.accessToken}` },
  });
  if (!response.ok) throw new Error("Fetch groups failed");
  return response.json();
};

export const fetchGroupMessages = async (groupId) => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const response = await fetch(`${baseUrl}/groups/${groupId}/messages`, {
    headers: { Authorization: `Bearer ${tokens?.accessToken}` },
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.log("Fetch group messages failed:", response.status, errorText);
    throw new Error("Fetch group messages failed: " + errorText);
  }
  return response.json();
};

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

export const joinGroup = async (groupId) => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const response = await fetch(`${baseUrl}/groups/${groupId}/join`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokens?.accessToken}` },
  });
  if (!response.ok) throw new Error("Join group failed");
  return response.json();
};

export const leaveGroup = async (groupId) => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const response = await fetch(`${baseUrl}/groups/${groupId}/leave`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokens?.accessToken}` },
  });
  if (!response.ok) throw new Error("Leave group failed");
  return response.json();
};

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

export const dissolveGroup = async (groupId) => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const response = await fetch(`${baseUrl}/groups/${groupId}/dissolve`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokens?.accessToken}` },
  });
  if (!response.ok) throw new Error("Dissolve group failed");
  return response.json();
};

export const refreshGroups = async () => {
  // Có thể thêm logic cache hoặc force reload nếu muốn
  return fetchGroups();
};

export const uploadGroupFile = async (file) => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${baseUrl}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens?.accessToken}`,
    },
    body: formData,
  });
  if (!response.ok) throw new Error("Upload file failed");
  return response.json();
};

export const removeMember = async (groupId, memberId) => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const response = await fetch(`${baseUrl}/groups/${groupId}/remove-member`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokens?.accessToken}`,
    },
    body: JSON.stringify({ memberId }),
  });
  if (!response.ok) throw new Error("Remove member failed");
  return response.json();
};

export const addMember = async (groupId, memberId) => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const response = await fetch(`${baseUrl}/groups/${groupId}/add-member`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokens?.accessToken}`,
    },
    body: JSON.stringify({ memberId }),
  });
  if (!response.ok) throw new Error("Add member failed");
  return response.json();
};
