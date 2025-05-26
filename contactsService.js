import { baseUrl } from "../utils/config";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const fetchFriends = async () => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const response = await fetch(`${baseUrl}/contacts/friends`, {
    headers: { Authorization: `Bearer ${tokens?.accessToken}` },
  });
  if (!response.ok) throw new Error("Fetch friends failed");
  return response.json();
};

export const fetchFriendRequests = async () => {
  const tokens = JSON.parse(await AsyncStorage.getItem("tokens"));
  const response = await fetch(`${baseUrl}/contacts/friend-requests`, {
    headers: { Authorization: `Bearer ${tokens?.accessToken}` },
  });
  if (!response.ok) throw new Error("Fetch friend requests failed");
  return response.json();
};

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
