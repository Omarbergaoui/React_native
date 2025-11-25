import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { auth } from "../config";
import { getDatabase, ref, push, onValue } from "firebase/database";
import { Ionicons } from "@expo/vector-icons";

export default function Chat({ route }) {

  const { userId, nom ,prenom} = route.params;
  const currentUser = auth.currentUser;

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const flatListRef = useRef();

  const db = getDatabase();

  const chatId =
    currentUser.uid < userId
      ? `${currentUser.uid}_${userId}`
      : `${userId}_${currentUser.uid}`;

  const messagesRef = ref(db, "messages/" + chatId);

  
  useEffect(() => {
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const msgs = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        msgs.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(msgs);
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  
  const handleSend = () => {
    if (newMessage.trim() === "") return;

    push(messagesRef, {
      text: newMessage,
      sender: currentUser.uid,
      timestamp: Date.now(),
    });

    setNewMessage("");
  };

  const renderItem = ({ item }) => {
    const isMe = item.sender === currentUser.uid;
    return (
      <View
        style={[
          styles.messageContainer,
          isMe ? styles.myMessage : styles.otherMessage,
        ]}
      >
        <Text style={styles.messageText}>{item.text}</Text>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerText}>{prenom} {nom}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        onContentSizeChange={() =>
          flatListRef.current.scrollToEnd({ animated: true })
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Message..."
          placeholderTextColor="#aaa"
          value={newMessage}
          onChangeText={setNewMessage}
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Ionicons name="send" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#272829",paddingVertical: 30 },

  header: {
    height: 60,
    backgroundColor: "#075E54",
    justifyContent: "center",
    paddingHorizontal: 15,
  },
  headerText: { color: "#fff", fontSize: 20, fontWeight: "bold" },

  messagesList: { padding: 10 },

  messageContainer: {
    maxWidth: "75%",
    borderRadius: 10,
    padding: 10,
    marginVertical: 5,
  },
  myMessage: {
    backgroundColor: "#1e90ff",
    alignSelf: "flex-end",
    borderTopRightRadius: 0,
  },
  otherMessage: {
    backgroundColor: "#323437",
    alignSelf: "flex-start",
    borderTopLeftRadius: 0,
  },
  messageText: { color: "#fff", fontSize: 16 },
  timestamp: { color: "#ccc", fontSize: 10, textAlign: "right", marginTop: 2 },

  inputContainer: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#323437",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#3d3f41",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    color: "#fff",
    fontSize: 16,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: "#1e90ff",
    padding: 12,
    borderRadius: 25,
  },
});
