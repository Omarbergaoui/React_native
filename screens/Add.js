import React, { useState, useCallback } from "react";
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Image, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ref, set, get, remove } from "firebase/database";
import { database, auth } from "../config";

export default function Add() {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [numero, setNumero] = useState("");
  useFocusEffect(
    useCallback(() => {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = ref(database, "profils/" + user.uid);

      get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setNom(data.nom || "");
          setPrenom(data.prenom || "");
          setNumero(data.numero || "");
        } else {
          setNom("");
          setPrenom("");
          setNumero("");
        }
      });
    }, [])
  );

  const handleSave = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("Vous devez être connecté");
        return;
      }

      const userRef = ref(database, "profils/" + user.uid);

      await set(userRef, {
        nom,
        prenom,
        numero,
        uid: user.uid,
        status: "online",      
        lastseen: Date.now(),
      });

      alert("Profil enregistré !");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Supprimer votre compte",
      "Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              const user = auth.currentUser;
              await remove(ref(database, "profils/" + user.uid));
              alert("Compte supprimé avec succès !");
            } catch (error) {
              alert(error.message);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: "https://cdn-icons-png.flaticon.com/512/149/149071.png" }}
        style={styles.profileImage}
      />

      <TextInput
        style={styles.input}
        placeholder="Nom"
        placeholderTextColor="#aaa"
        value={nom}
        onChangeText={setNom}
      />

      <TextInput
        style={styles.input}
        placeholder="Prénom"
        placeholderTextColor="#aaa"
        value={prenom}
        onChangeText={setPrenom}
      />

      <TextInput
        style={styles.input}
        placeholder="Numéro"
        placeholderTextColor="#aaa"
        value={numero}
        keyboardType="numeric"
        onChangeText={setNumero}
      />

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>Sauvegarder</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, { backgroundColor: "red", marginTop: 15 }]} onPress={handleDeleteAccount}>
        <Text style={styles.buttonText}>Supprimer mon compte</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#272829",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: "#fff",
    marginBottom: 25,
  },
  input: {
    width: "90%",
    backgroundColor: "#3d3f41",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    color: "#fff",
  },
  button: {
    width: "90%",
    backgroundColor: "#1e90ff",
    padding: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
  },
});
