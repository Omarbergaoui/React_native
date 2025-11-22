import React, { useState, useCallback } from "react";
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Image } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ref, push } from "firebase/database";
import { database, auth } from "../config";

export default function Add() {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [numero, setNumero] = useState("");

  // Réinitialisation automatique du formulaire
  useFocusEffect(
    useCallback(() => {
      setNom("");
      setPrenom("");
      setNumero("");
    }, [])
  );

  const handleSave = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("Vous devez être connecté");
        return;
      }

      // Référence vers "profils/profileId"
      const profilsRef = ref(database, "profils"); 
      await push(profilsRef, {
        uid: user.uid,  // ID de l'utilisateur
        nom,
        prenom,
        numero,
      });

      alert("Profil enregistré !");
    } catch (error) {
      alert(error.message);
    }
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
        <Text style={styles.buttonText}>Save</Text>
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
