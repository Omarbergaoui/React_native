import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from "@react-navigation/native";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { ref, set, onDisconnect } from "firebase/database";
import { auth, database } from "./config";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SignIn from "./screens/SignIn";
import SignUp from "./screens/SignUp";
import Acceuil from './screens/Acceuil';
import Chat from './screens/Chat';
const Stack = createNativeStackNavigator();
export default function App() {
   useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        
        const statusRef = ref(database, `profils/${user.uid}/status`);
        const lastSeenRef = ref(database, `profils/${user.uid}/lastSeen`);

        set(statusRef, "online");
        onDisconnect(statusRef).set("offline");
        onDisconnect(lastSeenRef).set(Date.now());
      }
    });

    return () => unsubscribe(); // Nettoyage à la fermeture de App
  }, []);
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="SignIn" component={SignIn} />
        <Stack.Screen name="SignUp" component={SignUp} />
        <Stack.Screen name="Acceuil" component={Acceuil} />
        <Stack.Screen name="Chat" component={Chat} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}


