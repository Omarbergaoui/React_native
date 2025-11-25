import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import Add from "./Add";
import List from "./List";
import Groupe from "./Groupe";

const Tab = createBottomTabNavigator();

export default function Acceuil() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarStyle: {
          backgroundColor: "#272829e8",
          borderTopWidth: 0,
          elevation: 0,
          height: 60,
          paddingBottom: 10,
          paddingTop: 10,
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },

        tabBarActiveTintColor: "#075E54",
        tabBarInactiveTintColor: "#aaa",

        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === "Profile") iconName = "person";
          else if (route.name === "List") iconName = "list";
          else if (route.name === "Group") iconName="people";

          return <Ionicons name={iconName} size={26} color={color} />;
        },
      })}
    >
      <Tab.Screen name="List" component={List} />
      <Tab.Screen name="Group" component={Groupe}/>
      <Tab.Screen name="Profile" component={Add} />
    </Tab.Navigator>
  );
}


