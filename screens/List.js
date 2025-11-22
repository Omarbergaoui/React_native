import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import { auth } from "../config";
import { getDatabase, ref, onValue } from "firebase/database";

export default function List({ navigation }) {
  const [profils, setProfils] = useState([]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.replace("SignIn");
    } catch (error) {
      alert(error.message);
    }
  };

  // Charger profils depuis Firebase
  useEffect(() => {
    const db = getDatabase();
    const profilsRef = ref(db, "profils");

    onValue(profilsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setProfils(Object.values(data)); // Convertir en tableau
      } else {
        setProfils([]);
      }
    });
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Navbar */}
      <View style={styles.navbar}>
        <Text style={styles.title}>WhatsApp</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Liste des profils */}
      <ScrollView style={styles.listContainer}>
        {profils.length === 0 ? (
          <Text style={styles.noData}>Aucun profil trouvé</Text>
        ) : (
          profils.map((p, index) => (
            <View key={index} style={styles.item}>
              <View style={styles.avatarPlaceholder} />
              <View>
                <Text style={styles.name}>{p.nom} {p.prenom}</Text>
                <Text style={styles.number}>{p.numero}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#272829" },

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

  noData: { color: "#ccc", fontSize: 18, textAlign: "center", marginTop: 40 },

  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#323437",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },

  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#555",
    marginRight: 15,
  },

  name: { color: "white", fontSize: 18, fontWeight: "700" },
  number: { color: "#ccc", fontSize: 15 },
});
