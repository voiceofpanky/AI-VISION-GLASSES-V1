/*
React Native (Expo/Snack-safe) App: AI Assistive Glasses with Object Detection & Audio Description

GOAL:
- Allow user to upload/take a picture (upload or camera capture).
- Detect objects in the uploaded/captured image and convert them into natural language audio descriptions.
- Fully bundler-safe for Expo Snack/web.
- Mock mode included for testing without native device features.
- Preconfigured with Hugging Face OwlViT object detection API endpoint.
*/

import React, { useState, useRef } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet, Platform, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';

const DEFAULT_USE_MOCK = true;
// Hugging Face OwlViT API endpoint
const DEFAULT_SERVER_URL = 'https://api-inference.huggingface.co/models/google/owlvit-base-patch32';
const HUGGINGFACE_API_KEY = 'YOUR_HUGGINGFACE_API_KEY';

export default function App() {
  const [useMock, setUseMock] = useState(DEFAULT_USE_MOCK);
  const [endpoint, setEndpoint] = useState(DEFAULT_SERVER_URL);
  const [processing, setProcessing] = useState(false);
  const [resultText, setResultText] = useState('');
  const [lastError, setLastError] = useState(null);
  const [image, setImage] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef(null);

  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const speakText = (text) => {
    if (!text) return;
    try {
      if (Platform.OS === 'web' && 'speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      } else {
        console.log('TTS (mock):', text);
      }
    } catch (err) {
      console.warn('TTS error', err);
    }
  };

  async function pickImage() {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setImage(asset.uri);
      detectObjectsAndSpeak(asset.base64);
    }
  }

  async function captureImage() {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ base64: true });
      setShowCamera(false);
      setImage(photo.uri);
      detectObjectsAndSpeak(photo.base64);
    }
  }

  async function detectObjectsAndSpeak(base64, { forceMock } = {}) {
    const activeMock = typeof forceMock === 'boolean' ? forceMock : useMock;
    setLastError(null);
    setResultText('');

    if (activeMock) {
      setProcessing(true);
      await new Promise(r => setTimeout(r, 500));
      const mockResult = "Mock: Detected a dog on the left, a ball in front, and a tree in the background.";
      setResultText(mockResult);
      speakText(mockResult);
      setProcessing(false);
      return mockResult;
    }

    if (!endpoint) {
      const msg = 'No endpoint configured. Set endpoint URL and disable mock mode.';
      setResultText(msg);
      speakText(msg);
      return msg;
    }

    try {
      setProcessing(true);
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: base64,
        })
      });

      if (!resp.ok) throw new Error(`Server returned status ${resp.status}`);
      const json = await resp.json();

      let objects = [];
      if (Array.isArray(json) && json[0]?.labels) {
        objects = json[0].labels;
      }

      const spoken = objects.length > 0 ? `Detected: ${objects.join(', ')}` : 'No objects detected.';
      setResultText(spoken);
      speakText(spoken);
      setProcessing(false);
      return spoken;
    } catch (err) {
      console.error('detectObjectsAndSpeak failed', err);
      setLastError(String(err));
      setResultText('Analysis failed.');
      setProcessing(false);
      return `Analysis failed: ${err.message || String(err)}`;
    }
  }

  if (showCamera) {
    if (hasPermission === null) return <View />;
    if (hasPermission === false) return <Text>No access to camera</Text>;

    return (
      <Camera style={{ flex: 1 }} ref={cameraRef}>
        <View style={{ flex: 1, justifyContent: 'flex-end', marginBottom: 36 }}>
          <TouchableOpacity style={styles.button} onPress={captureImage}>
            <Text style={styles.buttonText}>Capture</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, { marginTop: 10 }]} onPress={() => setShowCamera(false)}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Camera>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>AI Assistive Glasses — Upload/Capture & Detect Objects</Text>

        <View style={{ marginVertical: 8 }}>
          <Text style={styles.label}>Mode</Text>
          <View style={{ flexDirection: 'row', marginTop: 6 }}>
            <TouchableOpacity style={[styles.smallButton, useMock && styles.smallButtonActive]} onPress={() => setUseMock(true)}>
              <Text style={styles.smallButtonText}>Mock</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.smallButton, !useMock && styles.smallButtonActive]} onPress={() => setUseMock(false)}>
              <Text style={styles.smallButtonText}>Call HF Endpoint</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginVertical: 8 }}>
          <Text style={styles.label}>Endpoint</Text>
          <TextInput value={endpoint} onChangeText={setEndpoint} placeholder="https://server.url" style={styles.input} autoCapitalize="none" />
        </View>

        <View style={{ marginVertical: 8 }}>
          <TouchableOpacity style={styles.button} onPress={pickImage}>
            <Text style={styles.buttonText}>Upload Image & Detect</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, { marginTop: 10 }]} onPress={() => setShowCamera(true)}>
            <Text style={styles.buttonText}>Capture with Camera</Text>
          </TouchableOpacity>
        </View>

        {image && <Image source={{ uri: image }} style={{ width: '100%', height: 200, marginTop: 12, borderRadius: 10 }} />}

        <View style={{ marginVertical: 12 }}>
          <Text style={styles.label}>Result</Text>
          <View style={styles.resultBox}>
            {processing ? <ActivityIndicator color="#fff" /> : <Text style={styles.resultText}>{resultText || 'No result yet'}</Text>}
          </View>
          {lastError ? <Text style={{ color: 'salmon', marginTop: 8 }}>{lastError}</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 12, paddingTop: 12, paddingHorizontal: 4 },
  label: { color: '#ddd', fontWeight: '700' },
  input: { backgroundColor: '#222', color: '#fff', padding: 10, marginTop: 6, borderRadius: 8 },
  button: { backgroundColor: '#007aff', padding: 12, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  smallButton: { backgroundColor: '#222', padding: 8, borderRadius: 8, marginRight: 8 },
  smallButtonActive: { backgroundColor: '#007aff' },
  smallButtonText: { color: '#fff' },
  resultBox: { backgroundColor: '#000', padding: 12, borderRadius: 8, marginTop: 8, minHeight: 60 },
  resultText: { color: '#e6e6e6' },
});
