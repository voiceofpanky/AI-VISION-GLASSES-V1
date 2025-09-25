
import React, { useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, TextInput, Platform } from 'react-native';

// ---------------- CONFIG -----------------
const DEFAULT_USE_MOCK_BACKEND = true; // safe default for Snack / web
const DEFAULT_SEND_AS_FORMDATA = false; // set true if your server expects multipart/form-data

export default function App() {
  const [useMock, setUseMock] = useState(DEFAULT_USE_MOCK_BACKEND);
  const [sendAsFormData, setSendAsFormData] = useState(DEFAULT_SEND_AS_FORMDATA);
  const [endpoint, setEndpoint] = useState('');
  const [processing, setProcessing] = useState(false);
  const [resultText, setResultText] = useState('');
  const [tests, setTests] = useState([]);
  const [lastError, setLastError] = useState(null);

  // Text-to-speech: web-friendly fallback + console fallback
  const speakText = (text) => {
    if (!text) return;
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utter = new window.SpeechSynthesisUtterance(text);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      } else {
        // On native (or when Web Speech not available) we just console log —
        // you can later enable expo-speech in App.native.js
        console.log('TTS (mock):', text);
      }
    } catch (err) {
      console.warn('TTS error', err);
    }
  };

  // Main analyzer function.
  // Returns the spoken description string.
  async function analyzeImage(base64, { forceMock } = {}) {
    const useMockMode = typeof forceMock === 'boolean' ? forceMock : useMock;
    setLastError(null);
    setResultText('');

    if (useMockMode) {
      setProcessing(true);
      await new Promise((r) => setTimeout(r, 500));
      const mock = "Mock: person 2m ahead, chair to your right, sign reads 'Exit'.";
      setResultText(mock);
      speakText(mock);
      setProcessing(false);
      return mock;
    }

    if (!endpoint) {
      const msg = 'No endpoint configured. Set endpoint URL and disable mock mode to call your server.';
      setResultText(msg);
      speakText(msg);
      return msg;
    }

    try {
      setProcessing(true);
      const prompt = `You are an assistant for visually impaired users. Provide a short, prioritized spoken description of the scene. Include detected objects, text (if any) and useful navigation cues. Keep it concise (max 40 words). Prioritize immediate obstacles and person presence.`;

      let resp;
      if (sendAsFormData) {
        // FormData path — many servers accept this, but beware CORS in web
        const fd = new FormData();
        fd.append('image_base64', base64 || '');
        fd.append('prompt', prompt);
        resp = await fetch(endpoint, { method: 'POST', body: fd });
      } else {
        const payload = { image_base64: base64 || '', prompt };
        resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`Server error ${resp.status}: ${t}`);
      }
      const json = await resp.json();
      const spoken = json?.spoken_text || json?.text || 'No description available.';
      setResultText(spoken);
      speakText(spoken);
      setProcessing(false);
      return spoken;
    } catch (err) {
      console.error('analyzeImage failed', err);
      setLastError(String(err));
      setResultText('Analysis failed. See debug.');
      setProcessing(false);
      return `Analysis failed: ${err?.message || String(err)}`;
    }
  }

  // --------------- TESTS ------------------
  // Two basic tests added as internal test cases: (1) Mock behavior, (2) No-endpoint message
  async function runTests() {
    setTests([]);
    const results = [];

    // Test 1: Mock mode returns string starting with 'Mock:'
    try {
      const r = await analyzeImage('dummy-base64', { forceMock: true });
      const pass = typeof r === 'string' && r.startsWith('Mock:');
      results.push({ name: 'Mock backend returns expected string', pass, output: r });
    } catch (e) {
      results.push({ name: 'Mock backend returns expected string', pass: false, output: String(e) });
    }

    // Test 2: When not using mock and no endpoint configured -> helpful message returned
    try {
      const r = await analyzeImage('dummy-base64', { forceMock: false });
      const pass = typeof r === 'string' && r.includes('No endpoint configured');
      results.push({ name: 'No-endpoint yields helpful message', pass, output: r });
    } catch (e) {
      results.push({ name: 'No-endpoint yields helpful message', pass: false, output: String(e) });
    }

    setTests(results);
    return results;
  }

  // UI actions
  const onRunMock = async () => {
    await analyzeImage('dummy-base64', { forceMock: true });
  };

  const onCallEndpoint = async () => {
    await analyzeImage('dummy-base64', { forceMock: false });
  };

  // ----------------- RENDER -----------------
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>AI Assistive Glasses — Demo</Text>

        <View style={{ marginVertical: 8 }}>
          <Text style={styles.label}>Mode</Text>
          <View style={{ flexDirection: 'row', marginTop: 6 }}>
            <TouchableOpacity style={[styles.smallButton, useMock ? styles.smallButtonActive : null]} onPress={() => setUseMock(true)}>
              <Text style={styles.smallButtonText}>Mock</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.smallButton, !useMock ? styles.smallButtonActive : null]} onPress={() => setUseMock(false)}>
              <Text style={styles.smallButtonText}>Call Endpoint</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginVertical: 8 }}>
          <Text style={styles.label}>Endpoint (leave empty for mock)</Text>
          <TextInput
            value={endpoint}
            onChangeText={setEndpoint}
            placeholder="https://your-server.example.com/vision"
            style={styles.input}
            autoCapitalize="none"
          />
        </View>

        <View style={{ marginVertical: 8 }}>
          <TouchableOpacity style={styles.button} onPress={onRunMock}>
            <Text style={styles.buttonText}>Run Mock Description</Text>
          </TouchableOpacity>

          <View style={{ height: 8 }} />

          <TouchableOpacity style={styles.button} onPress={onCallEndpoint}>
            <Text style={styles.buttonText}>Call Endpoint (with current endpoint)</Text>
          </TouchableOpacity>

          <View style={{ height: 8 }} />

          <TouchableOpacity style={styles.buttonSecondary} onPress={async () => { setTests([]); setProcessing(true); await runTests(); setProcessing(false); }}>
            <Text style={styles.buttonSecondaryText}>Run Tests</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginVertical: 12 }}>
          <Text style={styles.label}>Result</Text>
          <View style={styles.resultBox}>
            {processing ? <ActivityIndicator color="#fff" /> : <Text style={styles.resultText}>{resultText || 'No result yet'}</Text>}
          </View>
          {lastError ? <Text style={{ color: 'salmon', marginTop: 8 }}>{lastError}</Text> : null}
        </View>

        <View style={{ marginVertical: 12 }}>
          <Text style={styles.label}>Tests</Text>
          {tests.length === 0 ? <Text style={styles.hint}>No tests run yet — click Run Tests.</Text> : (
            tests.map((t, i) => (
              <View key={i} style={{ marginTop: 8 }}>
                <Text style={{ color: t.pass ? '#8f8' : 'salmon', fontWeight: '700' }}>{t.pass ? 'PASS' : 'FAIL'} — {t.name}</Text>
                <Text style={styles.monotext}>{t.output}</Text>
              </View>
            ))
          )}
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={styles.footer}>Notes:</Text>
          <Text style={styles.hint}>• This file intentionally avoids any native expo imports to be Snack/web-friendly.
          • If you want full camera + speech integration on mobile, ask me to generate <Text style={{ fontWeight: '700' }}>App.native.js</Text> that uses expo-camera, expo-image-picker, and expo-speech — that file will not be used on web builds and avoids bundling errors.</Text>
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
  buttonSecondary: { backgroundColor: '#333', padding: 10, borderRadius: 8, alignItems: 'center' },
  buttonSecondaryText: { color: '#fff', fontWeight: '600' },
  smallButton: { backgroundColor: '#222', padding: 8, borderRadius: 8, marginRight: 8 },
  smallButtonActive: { backgroundColor: '#007aff' },
  smallButtonText: { color: '#fff' },
  resultBox: { backgroundColor: '#000', padding: 12, borderRadius: 8, marginTop: 8, minHeight: 60 },
  resultText: { color: '#e6e6e6' },
  monotext: { color: '#aaa', marginTop: 6 },
  hint: { color: '#aaa', marginTop: 6 },
  footer: { color: '#fff', fontWeight: '700' }
});