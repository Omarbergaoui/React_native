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
  Image,
  Linking,
  ImageBackground,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context"; 
import { auth } from "../config";
import { Ionicons } from "@expo/vector-icons";
import {
  getDatabase,
  ref,
  push,
  onValue,
  update,
  get,
  query,
  orderByChild,
  limitToLast,
  endAt,
  set,
} from "firebase/database";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import { createClient } from '@supabase/supabase-js'
import * as Location from "expo-location";
import * as FileSystem from 'expo-file-system';

const WHATSAPP_GREEN_DARK = "#075E54";
const WHATSAPP_GREEN_LIGHT = "#DCF8C6";
const WHATSAPP_GRAY_LIGHT = "#E5E5EA";
const WHATSAPP_BG_CHAT = "#ECE5DD";
const WHATSAPP_TEXT_PRIMARY = "#000";
const WHATSAPP_TEXT_SECONDARY = "#666";
const DOUBLE_CHECK_BLUE = "#4FC3F7";
import { supabase } from "../config/supabaseClient";

export default function Chat({ route, navigation }) {
  const { userId, nom, prenom } = route.params;
  const currentUser = auth.currentUser;
  const insets = useSafeAreaInsets();
  const flatListRef = useRef();
  const typingTimeoutRef = useRef(null);
  const db = getDatabase();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherStatus, setOtherStatus] = useState("offline");
  const [otherLastSeen, setOtherLastSeen] = useState(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showOptionsFor, setShowOptionsFor] = useState(null);
  const [showReactionsFor, setShowReactionsFor] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  
  // Nouveaux états
  const [selectedImage, setSelectedImage] = useState(null);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const PAGE_SIZE = 20;
  const [loadingMore, setLoadingMore] = useState(false);
  const [oldestTimestamp, setOldestTimestamp] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const chatId =
    currentUser.uid < userId
      ? `${currentUser.uid}_${userId}`
      : `${userId}_${currentUser.uid}`;

  const messagesRef = ref(db, "messages/" + chatId);
  const otherUserRef = ref(db, "profils/" + userId);

  const CHAT_BACKGROUND_URL =
    "https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d2937b7.jpg";

  useEffect(() => {
    const messagesQuery = query(messagesRef, orderByChild("timestamp"), limitToLast(PAGE_SIZE));
    const unsubscribe = onValue(messagesQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const msgs = Object.keys(data).map((key) => ({ id: key, ...data[key] }));
        msgs.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(msgs);
        const oldest = msgs.length ? msgs[0].timestamp : null;
        setOldestTimestamp(oldest);
        setHasMore(msgs.length >= PAGE_SIZE);
      } else {
        setMessages([]);
        setHasMore(false);
      }
    });
    return () => unsubscribe();
  }, [userId, chatId]);

  // ===== UPLOAD IMAGE =====
  const pickAndUploadImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission refusée", "Autorisez l'accès aux photos.");
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (result.canceled) return null;

    try {
      const uri = result.assets[0].uri;
      const fileExtension = uri.split('.').pop().toLowerCase();
      const mimeTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp'
      };
      const contentType = mimeTypes[fileExtension] || 'image/jpeg';
      const fileName = `${currentUser.uid}_${Date.now()}.${fileExtension}`;

      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("chat")
        .upload(fileName, arrayBuffer, {
          contentType: contentType,
          upsert: false,
        });

      if (uploadError) {
        console.error("Erreur upload:", uploadError);
        Alert.alert("Erreur upload", uploadError.message);
        return null;
      }

      const { data: publicUrlData } = supabase.storage
        .from("chat")
        .getPublicUrl(fileName);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        Alert.alert("Erreur", "Impossible de récupérer l'URL publique.");
        return null;
      }

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error("Erreur globale:", error);
      Alert.alert("Erreur", error.message || "Erreur lors de l'upload");
      return null;
    }
  };

  // ===== UPLOAD DOCUMENT =====
const pickAndUploadDocument = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });

    // Vérifier l'annulation
    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const fileName = `${currentUser.uid}_${Date.now()}_${asset.name}`;
    
    console.log('Document sélectionné:', {
      name: asset.name,
      size: asset.size,
      mimeType: asset.mimeType,
      uri: asset.uri
    });

    // Vérifier la taille (limite à 10MB)
    if (asset.size && asset.size > 10 * 1024 * 1024) {
      Alert.alert("Fichier trop volumineux", "La taille maximale est de 10 MB");
      return null;
    }

    // Créer un FormData
    const formData = new FormData();
    formData.append('file', {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType || 'application/octet-stream',
    });

    console.log('Upload en cours...');

    // Upload avec l'API REST de Supabase
    const uploadUrl = `https://uoqziimfvzyzwvyycxlp.supabase.co/storage/v1/object/chat/${fileName}`;
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcXppaW1mdnp5end2eXljeGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjM1ODYsImV4cCI6MjA3OTg5OTU4Nn0.nRH40VgCvhcur0mCzpqvC6M9DyCe0DRQoa2reyzqB9E`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erreur response:', errorText);
      Alert.alert("Erreur upload", "Impossible d'uploader le fichier.");
      return null;
    }

    console.log('Upload réussi!');

    // Récupérer l'URL publique
    const { data: publicUrlData } = supabase.storage
      .from("chat")
      .getPublicUrl(fileName);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      Alert.alert("Erreur", "Impossible de récupérer l'URL publique.");
      return null;
    }

    return {
      url: publicUrlData.publicUrl,
      name: asset.name,
      size: asset.size,
      type: asset.mimeType || 'application/octet-stream',
    };
  } catch (error) {
    console.error("Erreur document complète:", error);
    Alert.alert("Erreur", error.message || "Erreur lors de l'upload");
    return null;
  }
};


  // AUDIO : Correction complète des fonctions d'enregistrement

const startRecording = async () => {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission refusée", "Autorisez l'accès au microphone.");
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    
    setRecording(recording);
    setIsRecording(true);
  } catch (err) {
    console.error('Erreur enregistrement:', err);
    Alert.alert("Erreur", "Impossible de démarrer l'enregistrement");
  }
};

const stopRecording = async () => {
  if (!recording) return;

  try {
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);

    if (!uri) {
      Alert.alert("Erreur", "Aucun enregistrement trouvé");
      return;
    }

    console.log('URI audio:', uri);

    // Upload audio avec FormData
    const fileName = `${currentUser.uid}_${Date.now()}.m4a`;
    
    const formData = new FormData();
    formData.append('file', {
      uri: uri,
      name: fileName,
      type: 'audio/m4a',
    });

    console.log('Upload audio en cours...');

    // Upload avec l'API REST de Supabase
    const uploadUrl = `https://uoqziimfvzyzwvyycxlp.supabase.co/storage/v1/object/chat/${fileName}`;
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcXppaW1mdnp5end2eXljeGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjM1ODYsImV4cCI6MjA3OTg5OTU4Nn0.nRH40VgCvhcur0mCzpqvC6M9DyCe0DRQoa2reyzqB9E`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erreur upload audio:', errorText);
      Alert.alert("Erreur", "Impossible d'uploader l'audio");
      return;
    }

    console.log('Upload audio réussi!');

    const { data: publicUrlData } = supabase.storage
      .from("chat")
      .getPublicUrl(fileName);

    // Envoyer le message audio
    push(messagesRef, {
      audio: publicUrlData.publicUrl,
      sender: currentUser.uid,
      timestamp: Date.now(),
      readAt: null,
    });
  } catch (error) {
    console.error('Erreur stop recording:', error);
    Alert.alert("Erreur", "Erreur lors de l'arrêt de l'enregistrement");
  }
};

const cancelRecording = async () => {
  if (recording) {
    try {
      await recording.stopAndUnloadAsync();
      setRecording(null);
      setIsRecording(false);
    } catch (error) {
      console.error('Erreur cancel recording:', error);
    }
  }
};

const playAudio = async (audioUrl) => {
  try {
    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUrl },
      { shouldPlay: true }
    );
    await sound.playAsync();
    
    // Libérer la ressource après lecture
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch (error) {
    console.error("Erreur lecture audio:", error);
    Alert.alert("Erreur", "Impossible de lire l'audio");
  }
};

  const loadMoreMessages = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      if (!oldestTimestamp) {
        setHasMore(false);
        setLoadingMore(false);
        return;
      }
      const olderQuery = query(
        messagesRef,
        orderByChild("timestamp"),
        endAt(oldestTimestamp - 1),
        limitToLast(PAGE_SIZE)
      );
      const snap = await get(olderQuery);
      const data = snap.val();
      if (data) {
        const olderMsgs = Object.keys(data).map((k) => ({ id: k, ...data[k] }));
        olderMsgs.sort((a, b) => a.timestamp - b.timestamp);
        setMessages((prev) => [...olderMsgs, ...prev]);
        setOldestTimestamp(olderMsgs.length ? olderMsgs[0].timestamp : oldestTimestamp);
        setHasMore(olderMsgs.length >= PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Load more error:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const unsubscribeStatus = onValue(otherUserRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setOtherStatus(data.status || "offline");
        setOtherLastSeen(data.lastSeen || null);
      }
    });
    return () => unsubscribeStatus();
  }, [userId]);

  useEffect(() => {
    const otherTypingRef = ref(db, `typing/${chatId}/${userId}`);
    const unsubscribeTyping = onValue(otherTypingRef, (snap) => {
      const val = snap.val();
      setOtherTyping(val?.typing || false);
    });
    return () => unsubscribeTyping();
  }, [userId, chatId]);

  const setTyping = (isTyping) => {
    try {
      set(ref(db, `typing/${chatId}/${currentUser.uid}`), { typing: isTyping });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!messages.length || !currentUser) return;
    messages.forEach((msg) => {
      if (msg.sender !== currentUser.uid && !msg.readAt) {
        update(ref(db, `messages/${chatId}/${msg.id}`), { readAt: Date.now() }).catch(console.error);
      }
    });
  }, [messages, currentUser.uid, chatId]);

  const handleSend = () => {
    if (editingMessage) {
      const updatePath = `messages/${chatId}/${editingMessage.id}`;
      update(ref(db), {
        [`${updatePath}/text`]: newMessage.trim(),
        [`${updatePath}/edited`]: true,
      }).then(() => {
        setEditingMessage(null);
        setNewMessage("");
      });
      return;
    }
    if (newMessage.trim() === "") return;
    push(messagesRef, {
      text: newMessage.trim(),
      sender: currentUser.uid,
      timestamp: Date.now(),
      readAt: null,
    }).catch(console.error);
    setNewMessage("");
    setTyping(false);
  };

  const handleSendLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission refusée", "Autorisez l'accès à la localisation.");
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      push(messagesRef, {
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        sender: currentUser.uid,
        timestamp: Date.now(),
        readAt: null,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleSoftDelete = (messageId) => {
    const updatePath = `messages/${chatId}/${messageId}`;
    update(ref(db), {
      [`${updatePath}/text`]: "Message supprimé",
      [`${updatePath}/deleted`]: true,
      [`${updatePath}/edited`]: false,
    }).catch(console.error);
    setShowOptionsFor(null);
  };

  const sendReaction = (messageId, emoji) => {
    update(ref(db), {
      [`messages/${chatId}/${messageId}/reactions/${currentUser.uid}`]: emoji,
    }).then(() => setShowReactionsFor(null))
      .catch(console.error);
  };

  const removeReaction = (messageId) => {
    update(ref(db), {
      [`messages/${chatId}/${messageId}/reactions/${currentUser.uid}`]: null,
    }).catch(console.error);
  };

  const handleChangeText = (txt) => {
    setNewMessage(txt);
    setTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTyping(false), 2000);
  };

  const startEditingMessage = (message) => {
    setEditingMessage(message);
    setNewMessage(message.text);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const renderItem = ({ item }) => {
    const isMe = item.sender === currentUser.uid;
    const timeString = item.timestamp
      ? new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";

    const reactionsSummary = item.reactions
      ? Object.values(item.reactions).reduce((acc, cur) => {
          acc[cur] = (acc[cur] || 0) + 1;
          return acc;
        }, {})
      : null;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          if (item.image) {
            setSelectedImage(item.image);
          } else {
            setShowReactionsFor(item);
          }
        }}
        onLongPress={() => setShowOptionsFor(item)}
      >
        <View style={[styles.messageWrapper, isMe ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
          <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.otherMessage]}>
            {item.deleted ? (
              <Text style={[styles.messageText, { fontStyle: "italic", color: "grey" }]}>Message supprimé</Text>
            ) : (
              <>
                {item.text && <Text style={styles.messageText}>{item.text}{item.edited ? " (modifié)" : ""}</Text>}
                
                {/* Image */}
                {item.image && (
                  <Image
                    source={{ uri: item.image }}
                    style={{ width: 200, height: 200, borderRadius: 8, marginTop: 4 }}
                    resizeMode="cover"
                  />
                )}

                {/* Location */}
                {item.location && (
                  <TouchableOpacity onPress={() => Linking.openURL(`https://maps.google.com/?q=${item.location.latitude},${item.location.longitude}`)}>
                    <Text style={[styles.messageText, { color: "blue" }]}>📍 Ma position</Text>
                  </TouchableOpacity>
                )}

                {/* Audio */}
                {item.audio && (
                  <TouchableOpacity 
                    onPress={() => playAudio(item.audio)}
                    style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}
                  >
                    <Ionicons name="play-circle" size={32} color={isMe ? WHATSAPP_GREEN_DARK : "#555"} />
                    <Text style={[styles.messageText, { marginLeft: 8 }]}>🎤 Message vocal</Text>
                  </TouchableOpacity>
                )}

                {/* Document */}
                {item.document && (
                  <TouchableOpacity 
                    onPress={() => Linking.openURL(item.document.url)}
                    style={{ paddingVertical: 4 }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Ionicons name="document-attach" size={24} color={isMe ? WHATSAPP_GREEN_DARK : "#555"} />
                      <View style={{ marginLeft: 8, flex: 1 }}>
                        <Text style={[styles.messageText, { fontWeight: "600" }]} numberOfLines={1}>
                          {item.document.name}
                        </Text>
                        {item.document.size && (
                          <Text style={{ fontSize: 11, color: WHATSAPP_TEXT_SECONDARY }}>
                            {formatFileSize(item.document.size)}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              </>
            )}

            {reactionsSummary && (
              <View style={{ flexDirection: "row", marginTop: 6 }}>
                {Object.entries(reactionsSummary).map(([emoji, count]) => (
                  <View key={emoji} style={{ paddingHorizontal: 6, paddingVertical: 3, backgroundColor: "#fff", borderRadius: 12, marginRight: 6, borderWidth: 0.5, borderColor: "#ddd", flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ marginRight: 4 }}>{emoji}</Text>
                    <Text style={{ fontSize: 12, color: "#333" }}>{count}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.statusContainer}>
              <Text style={styles.timestamp}>{timeString}</Text>
              {isMe && item.readAt && <Ionicons name="checkmark-done" size={16} color={DOUBLE_CHECK_BLUE} style={styles.checkIcon} />}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const getStatusText = () => {
    if (otherTyping) return "en train d'écrire...";
    if (otherStatus === "online") return "en ligne";
    if (otherLastSeen) {
      const date = new Date(otherLastSeen);
      return `Dernière fois ${date.toLocaleDateString()} à ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    return "hors ligne";
  };

  return (
    <View style={{ flex: 1, backgroundColor: WHATSAPP_BG_CHAT }}>
      <StatusBar barStyle="light-content" backgroundColor={WHATSAPP_GREEN_DARK} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : StatusBar.currentHeight}>
        <View style={[styles.header, { paddingTop: insets.top || 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/149/149071.png" }} style={styles.avatar} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerText}>{prenom} {nom}</Text>
            <Text style={styles.headerStatus}>{getStatusText()}</Text>
          </View>
        </View>

        <ImageBackground source={{ uri: CHAT_BACKGROUND_URL }} style={styles.messagesListBackground} imageStyle={{ opacity: 0.1 }}>
          {hasMore && (
            <TouchableOpacity onPress={loadMoreMessages} style={{ padding: 10, alignItems: "center" }}>
              {loadingMore ? <ActivityIndicator /> : <Text style={{ color: "blue" }}>Charger plus</Text>}
            </TouchableOpacity>
          )}

          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          {otherTyping && (
            <View style={{ paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontStyle: "italic", color: "#555" }}>{prenom} est en train d'écrire...</Text>
            </View>
          )}
        </ImageBackground>

        {/* MODAL IMAGE EN PLEIN ÉCRAN */}
        <Modal visible={!!selectedImage} transparent animationType="fade">
          <View style={styles.imageModalOverlay}>
            <TouchableOpacity 
              style={styles.closeImageButton}
              onPress={() => setSelectedImage(null)}
            >
              <Ionicons name="close" size={32} color="#fff" />
            </TouchableOpacity>
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          </View>
        </Modal>

        {/* MODAL OPTIONS MESSAGE */}
        <Modal visible={!!showOptionsFor} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              {showOptionsFor?.sender === currentUser.uid && (
                <TouchableOpacity onPress={() => { startEditingMessage(showOptionsFor); setShowOptionsFor(null); }}>
                  <Text style={styles.modalBtn}>✏️ Modifier</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => { setShowReactionsFor(showOptionsFor); setShowOptionsFor(null); }}>
                <Text style={styles.modalBtn}>🙂 Réagir</Text>
              </TouchableOpacity>
              {showOptionsFor?.sender === currentUser.uid && (
                <TouchableOpacity onPress={() => { handleSoftDelete(showOptionsFor.id); setShowOptionsFor(null); }}>
                  <Text style={[styles.modalBtn, { color: "red" }]}>🗑 Supprimer</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setShowOptionsFor(null)}>
                <Text style={styles.modalCancel}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* MODAL REACTIONS */}
        <Modal visible={!!showReactionsFor} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBoxRow}>
              {["❤️", "😂", "👍", "😮", "😢", "😡"].map((e) => (
                <TouchableOpacity key={e} onPress={() => sendReaction(showReactionsFor.id, e)}>
                  <Text style={{ fontSize: 26, marginHorizontal: 8 }}>{e}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => { removeReaction(showReactionsFor.id); setShowReactionsFor(null); }}>
                <Text style={{ color: "blue", paddingLeft: 12 }}>Retirer</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowReactionsFor(null)}>
                <Text style={{ color: "blue", paddingLeft: 12 }}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* MODAL MENU ATTACHMENTS */}
        <Modal visible={showAttachMenu} transparent animationType="slide">
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1}
            onPress={() => setShowAttachMenu(false)}
          >
            <View style={styles.attachMenuBox}>
              <TouchableOpacity 
                style={styles.attachMenuItem}
                onPress={async () => {
                  setShowAttachMenu(false);
                  const docData = await pickAndUploadDocument();
                  if (docData) {
                    push(messagesRef, {
                      document: docData,
                      sender: currentUser.uid,
                      timestamp: Date.now(),
                      readAt: null,
                    });
                  }
                }}
              >
                <View style={[styles.attachIconCircle, { backgroundColor: "#9C27B0" }]}>
                  <Ionicons name="document" size={24} color="#fff" />
                </View>
                <Text style={styles.attachMenuText}>Document</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.attachMenuItem}
                onPress={async () => {
                  setShowAttachMenu(false);
                  handleSendLocation();
                }}
              >
                <View style={[styles.attachIconCircle, { backgroundColor: "#4CAF50" }]}>
                  <Ionicons name="location" size={24} color="#fff" />
                </View>
                <Text style={styles.attachMenuText}>Position</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
        {/* MODAL REACTIONS */}{/* BARRE D'INPUT */}
<View style={[styles.inputBar, { paddingBottom: insets.bottom || 8 }]}>
  {!isRecording ? (
    <>
      <View style={styles.chatInputWrapper}>
        <TouchableOpacity
          onPress={async () => {
            const imageUrl = await pickAndUploadImage();
            if (!imageUrl) return;
            push(messagesRef, {
              image: imageUrl,
              sender: currentUser.uid,
              timestamp: Date.now(),
              readAt: null,
            });
          }}
        >
          <Ionicons name="image-outline" size={28} color="#555" />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder={editingMessage ? "Modifier le message..." : "Message..."}
          placeholderTextColor="#aaa"
          value={newMessage}
          onChangeText={handleChangeText}
          multiline
        />

        <TouchableOpacity onPress={() => setShowAttachMenu(true)}>
          <Ionicons
            name="attach-outline"
            size={24}
            color="#aaa"
            style={styles.inputIcon}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={newMessage.trim().length > 0 ? handleSend : startRecording}
        style={styles.sendButton}
      >
        <Ionicons
          name={newMessage.trim().length > 0 ? "send" : "mic"}
          size={24}
          color="white"
        />
      </TouchableOpacity>
    </>
  ) : (
    // Mode enregistrement
    <View style={styles.recordingBar}>
      <TouchableOpacity onPress={cancelRecording} style={styles.cancelRecordButton}>
        <Ionicons name="trash" size={24} color="#E53935" />
      </TouchableOpacity>

      <View
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={styles.recordingDot} />
        <Text style={styles.recordingText}>Enregistrement en cours...</Text>
      </View>

      <TouchableOpacity onPress={stopRecording} style={styles.sendButton}>
        <Ionicons name="send" size={24} color="white" />
      </TouchableOpacity>
    </View>
  )}
</View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    backgroundColor: WHATSAPP_GREEN_DARK,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginLeft: 10 },
  headerInfo: { flex: 1, marginLeft: 10 },
  headerText: { color: "#fff", fontSize: 17, fontWeight: "bold", lineHeight: 20 },
  headerStatus: { color: "#ccc", fontSize: 12 },

  // Messages
  messagesListBackground: { flex: 1, backgroundColor: WHATSAPP_BG_CHAT },
  messagesList: { paddingHorizontal: 10, paddingVertical: 5 },
  messageWrapper: { flexDirection: "row", marginVertical: 2 },
  myMessageWrapper: { justifyContent: "flex-end" },
  otherMessageWrapper: { justifyContent: "flex-start" },
  messageContainer: {
    maxWidth: "80%",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  myMessage: { backgroundColor: WHATSAPP_GREEN_LIGHT },
  otherMessage: { backgroundColor: WHATSAPP_GRAY_LIGHT },
  messageText: { fontSize: 15, color: WHATSAPP_TEXT_PRIMARY },
  statusContainer: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4 },
  timestamp: { fontSize: 10, color: WHATSAPP_TEXT_SECONDARY },
  checkIcon: { marginLeft: 4 },

  // Input Bar
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 6,
    backgroundColor: "#f0f0f0",
  },
  chatInputWrapper: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 20,
    alignItems: "center",
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    paddingVertical: 6,
    color: "#000",
    paddingHorizontal: 8,
  },
  inputIcon: { marginHorizontal: 4 },
  sendButton: { marginLeft: 8, backgroundColor: WHATSAPP_GREEN_DARK, borderRadius: 20, padding: 10 },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: { backgroundColor: "#fff", borderRadius: 8, padding: 16, minWidth: 200 },
  modalBoxRow: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBtn: { fontSize: 16, paddingVertical: 8 },
  modalCancel: { fontSize: 16, color: "blue", marginTop: 8, textAlign: "center" },

  // Modal image plein écran
  imageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeImageButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  fullScreenImage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },

  // Menu attachments
  attachMenuBox: {
    position: "absolute",
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  attachMenuItem: { alignItems: "center" },
  attachIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  attachMenuText: { fontSize: 12, color: "#555" },

  // Enregistrement audio
  recordingBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cancelRecordButton: { padding: 8 },
  recordingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#E53935", marginRight: 8 },
  recordingText: { fontSize: 14, color: "#E53935", fontWeight: "500" },
});

