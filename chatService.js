import { baseUrl } from "../utils/config";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

// export const sendMessage = async (
//   conversationId,
//   receiverId,
//   content,
//   type
// ) => {
//   const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
//   const response = await fetch(`${baseUrl}/chats/send-message`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${tokens?.accessToken}`,
//     },
//     body: JSON.stringify({
//       conversationId,
//       receiverId,
//       content,
//       type,
//       timestamp: new Date().toISOString(),
//     }),
//   });
//   if (!response.ok) throw new Error("Send message failed");
//   return response.json();
// };

export const uploadFile = async (file) => {
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

const connectSocket = async () => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  setCurrentUser(tokens?.username || tokens?.userId || "me");
  socketRef.current = io(`http://${IP}:${PORT}`, {
    auth: { token: tokens?.accessToken },
    transports: ["websocket"],
  });
  // ...
};
