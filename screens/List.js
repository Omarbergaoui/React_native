import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "../config";
import { getDatabase, ref, onValue } from "firebase/database";

export default function List({ navigation }) {
  const [profils, setProfils] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // 🔹 1. Charger l'utilisateur connecté de manière SÛRE
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return unsub;
  }, []);

  // 🔹 2. Charger la liste des profils
  useEffect(() => {
    const db = getDatabase();
    const profilsRef = ref(db, "profils");

    onValue(profilsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const array = Object.keys(data).map((id) => ({
          id, // la CLE Firebase devient ID du profil
          ...data[id],
        }));
        setProfils(array);
      } else {
        setProfils([]);
      }
    });
  }, []);

  
  if (!currentUser) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: "#fff", fontSize: 18 }}>Chargement...</Text>
      </View>
    );
  }

  const autresProfils = profils.filter((p) => p.id !== currentUser.uid);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* NAVBAR */}
      <View style={styles.navbar}>
        <Text style={styles.title}>WhatsApp</Text>
        <TouchableOpacity
          onPress={() =>
            signOut(auth).then(() => navigation.replace("SignIn"))
          }
        >
          <Ionicons name="log-out-outline" size={28} color="white" />
        </TouchableOpacity>
      </View>


      <ScrollView style={styles.listContainer}>
        {autresProfils.length === 0 ? (
          <Text style={styles.noData}>Aucun utilisateur trouvé</Text>
        ) : (
          autresProfils.map((p) => (
            <TouchableOpacity
              key={p.id} // clé unique et propre
              style={styles.item}
              onPress={() =>
                navigation.navigate("Chat", {
                  userId: p.id,
                  nom: p.nom,
                  prenom: p.prenom
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

              <View>
                <Text style={styles.name}>
                  {p.nom} {p.prenom}
                </Text>
                <Text style={styles.number}>{p.numero}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#272829" },

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#272829",
  },

  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#075E54",
    paddingHorizontal: 15,
    paddingVertical: 12,
    paddingTop: 12 + StatusBar.currentHeight,
  },

  title: { color: "#fff", fontSize: 22, fontWeight: "700" },

  listContainer: { padding: 20 },

  noData: {
    color: "#ccc",
    fontSize: 18,
    textAlign: "center",
    marginTop: 40,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#323437",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    backgroundColor: "#444",
  },

  name: { color: "white", fontSize: 18, fontWeight: "700" },
  number: { color: "#ccc", fontSize: 15 },
});
