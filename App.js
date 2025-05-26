import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import FriendListScreen from "./src/views/FriendListScreen";
import ContactsScreen from "./src/views/ContactsScreen";
import SettingsScreen from "./src/views/SettingsScreen";
import GroupManagementScreen from "./src/views/GroupManagementScreen";
import GroupChatScreen from "./src/views/GroupChatScreen";
import ChatScreen from "./src/views/ChatScreen";
import ProfileScreen from "./src/views/ProfileScreen";
import ForgotPasswordScreen from "./src/views/ForgotPasswordScreen";
import OTPScreen from "./src/views/OTPScreen";
import RegisterScreen from "./src/views/RegisterScreen";
import LoginScreen from "./src/views/LoginScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="FriendList"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#0099FF",
        tabBarInactiveTintColor: "#888",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 0.5,
          borderTopColor: "#eee",
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 13, marginBottom: 6 },
        tabBarIcon: ({ color, size, focused }) => {
          if (route.name === "FriendList")
            return (
              <Ionicons
                name={focused ? "chatbubbles" : "chatbubbles-outline"}
                size={size}
                color={color}
              />
            );
          if (route.name === "Contacts")
            return (
              <Ionicons
                name={focused ? "people" : "people-outline"}
                size={size}
                color={color}
              />
            );
          if (route.name === "Groups")
            return (
              <MaterialIcons
                name={focused ? "groups" : "groups"}
                size={size}
                color={color}
              />
            );
          if (route.name === "Profile")
            return (
              <Ionicons
                name={focused ? "person" : "person-outline"}
                size={size}
                color={color}
              />
            );
          if (route.name === "Settings")
            return (
              <Ionicons
                name={focused ? "settings" : "settings-outline"}
                size={size}
                color={color}
              />
            );
          return null;
        },
      })}
    >
      <Tab.Screen
        name="FriendList"
        component={FriendListScreen}
        options={{ tabBarLabel: "Bạn bè" }}
      />
      <Tab.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{ tabBarLabel: "Danh bạ" }}
      />
      <Tab.Screen
        name="Groups"
        component={GroupChatScreen}
        options={{ tabBarLabel: "Nhóm" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: "Cá nhân" }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: "Cài đặt" }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen
              name="GroupManagement"
              component={GroupManagementScreen}
            />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />
            <Stack.Screen name="OTP" component={OTPScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </Stack.Navigator>
          <StatusBar style="auto" />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
