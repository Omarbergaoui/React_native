import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "../config";
import { getDatabase, ref, onValue } from "firebase/database";

const WHATSAPP_GREEN_DARK = "#075E54";
const WHATSAPP_GREEN_LIGHT = "#25D366";
const WHATSAPP_BG = "#fff"; 
const WHATSAPP_TEXT_SECONDARY = "#666";

export default function List({ navigation }) {
  const [profils, setProfils] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [messagesData, setMessagesData] = useState({});
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const db = getDatabase();
    const profilsRef = ref(db, "profils");

    const unsubscribe = onValue(profilsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const array = Object.keys(data).map((id) => ({
          id,
          ...data[id],
        }));
        setProfils(array);
      } else {
        setProfils([]);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentUser || profils.length === 0) return;
    const db = getDatabase();

    profils.forEach((p) => {
      if (p.id === currentUser.uid) return; 
      const chatId =
        currentUser.uid < p.id
          ? `${currentUser.uid}_${p.id}`
          : `${p.id}_${currentUser.uid}`;
      const messagesRef = ref(db, "messages/" + chatId);

      onValue(messagesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const msgs = Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
          }));
          msgs.sort((a, b) => a.timestamp - b.timestamp);

          setMessagesData((prev) => ({
            ...prev,
            [p.id]: msgs,
          }));
        } else {
          setMessagesData((prev) => ({
            ...prev,
            [p.id]: [],
          }));
        }
      });
    });
  }, [currentUser, profils]);

  if (!currentUser) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: WHATSAPP_TEXT_SECONDARY, fontSize: 18 }}>
          Chargement...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={WHATSAPP_GREEN_DARK} />

      {/* NAVBAR */}
      <View style={styles.navbar}>
        <Text style={styles.title}>WhatsApp</Text>
        <View style={styles.navbarIcons}>
          <Ionicons
            name="search-outline"
            size={24}
            color="white"
            style={{ marginRight: 20 }}
          />
          <TouchableOpacity
            onPress={() =>
              signOut(auth).then(() => navigation.replace("SignIn"))
            }
          >
            <Ionicons name="log-out" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      
      <ScrollView style={styles.listContainer}>
        {profils.filter(p => p.id !== currentUser.uid).length === 0 ? (
          <Text style={styles.noData}>Aucun utilisateur trouvé</Text>
        ) : (
          profils.filter(p => p.id !== currentUser.uid).map((p) => {
            const messages = messagesData[p.id] || [];
            const lastMessage = messages[messages.length - 1];

            const isMeLast = lastMessage?.sender === currentUser.uid;
            const isRead = lastMessage?.readAt != null;

            
            const unreadCount = messages.filter(
              (m) => m.sender === p.id && !m.readAt
            ).length;

            return (
              <TouchableOpacity
                key={p.id}
                style={styles.item}
                onPress={() =>
                  navigation.navigate("Chat", {
                    userId: p.id,
                    nom: p.nom,
                    prenom: p.prenom,
                  })
                }
              >
               
                <Image
                  source={{
                    uri:
                      p.photo ||
                      "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                  }}
                  style={styles.avatar}
                />

                
                <View style={styles.textContainer}>
                  <Text style={styles.name}>
                    {p.nom} {p.prenom}
                  </Text>

                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {isMeLast && lastMessage && (
                      <Ionicons
                        name="checkmark-done"
                        size={14}
                        color={isRead ? "#4FC3F7" : "#666"} style={{ marginRight: 4 }}
                      />
                    )}
                    <Text style={styles.lastMessage}>
                      {lastMessage?.text ?? "Aucun message"}
                    </Text>
                  </View>
                </View>

                
                {!isMeLast && unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{unreadCount}</Text>
                  </View>
                )}

                
                {lastMessage && (
                  <View style={styles.timeContainer}>
                    <Text style={styles.timestamp}>
                      {new Date(lastMessage.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WHATSAPP_BG },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: WHATSAPP_BG,
  },

  
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: WHATSAPP_GREEN_DARK,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10 + (StatusBar.currentHeight || 0),
  },
  title: { color: "#fff", fontSize: 22, fontWeight: "700" },
  navbarIcons: { flexDirection: "row", alignItems: "center" },

  
  listContainer: { flex: 1 },
  noData: { color: WHATSAPP_TEXT_SECONDARY, fontSize: 18, textAlign: "center", marginTop: 40 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
    backgroundColor: WHATSAPP_BG,
  },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15, backgroundColor: "#eee" },
  textContainer: { flex: 1, justifyContent: "center" },
  name: { color: "#000", fontSize: 16, fontWeight: "700" },
  lastMessage: { color: WHATSAPP_TEXT_SECONDARY, fontSize: 14 },
  timeContainer: { alignSelf: 'flex-start', marginTop: 5 },
  timestamp: { color: WHATSAPP_TEXT_SECONDARY, fontSize: 12 },

  unreadBadge: {
    backgroundColor: WHATSAPP_GREEN_LIGHT,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
});
