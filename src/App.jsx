import React, { useState, useRef, useEffect } from 'react';

// Iconos en SVG para no depender de librerías externas que puedan fallar
const IconBot = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
);
const IconClip = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
);
const IconMic = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
);
const IconSend = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
);

const ChatMessage = ({ role, text, fileName }) => {
  const isPre = typeof text === 'string' && (text.includes('\n') || text.includes('|') || text.includes('##'));
  return (
    <div style={{
      display: 'flex',
      justifyContent: role === 'user' ? 'flex-end' : 'flex-start',
      marginBottom: '1.5rem',
      padding: '0 1rem'
    }}>
      <div style={{
        maxWidth: '75%',
        padding: '1.2rem',
        borderRadius: role === 'user' ? '1.5rem 1.5rem 0 1.5rem' : '1.5rem 1.5rem 1.5rem 0',
        backgroundColor: role === 'user' ? '#2563eb' : '#1e293b',
        color: 'white',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
        border: role === 'user' ? 'none' : '1px solid #334155'
      }}>
        {fileName && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.75rem',
            backgroundColor: 'rgba(0,0,0,0.2)',
            padding: '0.5rem',
            borderRadius: '0.5rem',
            marginBottom: '0.5rem',
            fontFamily: 'monospace'
          }}>
            📄 {fileName}
          </div>
        )}
        {isPre ? (
          <pre style={{ margin: 0, lineHeight: '1.45', fontSize: '0.95rem', whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace', background: 'rgba(0,0,0,0.05)', padding: '0.6rem', borderRadius: '0.5rem' }}>{text}</pre>
        ) : (
          <p style={{ margin: 0, lineHeight: '1.5', fontSize: '0.95rem' }}>{text}</p>
        )}
        <div style={{ fontSize: '0.6rem', opacity: 0.5, marginTop: '0.5rem', textAlign: role === 'user' ? 'right' : 'left' }}>
          {role === 'user' ? 'ENVIADO' : 'NOVA CORE'}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Sistemas NOVA activos. Lista para procesar texto, voz o documentos. ¿En qué puedo ayudarte?' }
  ]);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [input, setInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(false);
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);
  const azureRecognizerRef = useRef(null);
  const azureSynthRef = useRef(null);
  const webRecRef = useRef(null);
  const synthesizerRef = useRef(null);
  const synthesizerTokenRef = useRef(0); // Token to track valid synthesis sessions
  const [azureReady, setAzureReady] = useState(false);
  const transcriptRef = useRef('');

  const API_URL = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Inicializar Azure Speech SDK (opcional). Requiere instalar: npm install microsoft-cognitiveservices-speech-sdk
  useEffect(() => {
    const key = import.meta.env.VITE_AZURE_SPEECH_KEY;
    const region = import.meta.env.VITE_AZURE_SPEECH_REGION;
    if (!key || !region) return;

    let cancelled = false;
    (async () => {
      try {
        const SpeechSDK = await import('microsoft-cognitiveservices-speech-sdk');
        if (cancelled) return;
        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(key, region);
        speechConfig.speechRecognitionLanguage = 'es-ES';
        // crear synthesizer y almacenarlo
        const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
        const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
        azureRecognizerRef.current = { sdk: SpeechSDK, recognizer };
        azureSynthRef.current = { sdk: SpeechSDK, speechConfig };
        setAzureReady(true);
      } catch (e) {
        console.warn('Azure Speech SDK no disponible:', e.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const stopSpeechPlayback = () => {
    if (synthesizerRef.current) {
      try {
        const currentSynth = synthesizerRef.current;
        synthesizerRef.current = null;
        currentSynth.stopSpeakingAsync(
          () => {
            try { currentSynth.close(); } catch (e) {}
          },
          () => {
            try { currentSynth.close(); } catch (e) {}
          }
        );
      } catch (e) {
        synthesizerRef.current = null;
      }
    }
    synthesizerTokenRef.current += 1;
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  useEffect(() => {
    if (!voiceModeEnabled) {
      stopSpeechPlayback();
    }
  }, [voiceModeEnabled]);

  const loadSessions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/sessions`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.sessions)) {
        setSessions(data.sessions);
      }
    } catch (e) {
      console.warn('No se pudieron cargar sesiones:', e.message);
    }
  };

  const formatSessionName = (s) => {
    if (!s || !s.created_at) return 'Nova-Sesion';
    const dt = new Date(s.created_at);
    if (Number.isNaN(dt.getTime())) return 'Nova-Sesion';
    const formatted = dt.toLocaleString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    return `Nova-${formatted}`;
  };

  const loadSessionMessages = async (sid) => {
    try {
      const res = await fetch(`${API_URL}/api/sessions/${sid}/messages?limit=200`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.messages)) {
        setMessages(data.messages.map((m) => ({ role: m.role, text: m.content })));
      }
    } catch (e) {
      console.warn('No se pudieron cargar mensajes:', e.message);
    }
  };

  const createNewSession = async () => {
    try {
      const res = await fetch(`${API_URL}/api/sessions`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setSessionId(data.session_id);
        setMessages([{ role: 'assistant', text: data.welcome || 'Sesión reiniciada.' }]);
        if (fileInputRef.current) fileInputRef.current.value = null;
        setSelectedFiles([]);
        loadSessions();
      }
    } catch (e) {
      setMessages([{ role: 'assistant', text: 'Error creando nueva sesión.' }]);
    }
  };

  // create a session on mount
  useEffect(() => {
    const createSession = async () => {
      try {
        const res = await fetch(`${API_URL}/api/sessions`, { method: 'POST' });
        const data = await res.json();
        if (data.ok) {
          setSessionId(data.session_id);
          if (data.welcome) setMessages(m => [...m, { role: 'assistant', text: data.welcome }]);
          loadSessions();
        }
      } catch (e) {
        console.warn('No se pudo crear session:', e.message);
      }
    };
    createSession();
  }, []);

  // Helper to send a query (used by text and voice flows)
  const sendQuery = async ({ text, files = [], viaVoice = false }) => {
    if (!text && files.length === 0) return;

    setMessages((m) => [...m, { role: 'user', text, fileName: files.length ? files.map(f => f.name).join(', ') : null }]);

    const form = new FormData();
    form.append('query', text);
    if (sessionId) form.append('session_id', sessionId);
    // Send voice_mode flag to indicate voice-enabled mode
    if (voiceModeEnabled) form.append('voice_mode', 'true');
    files.forEach((f) => form.append('files', f));

    // reset input/files in UI
    setInput('');
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = null;

    try {
      const res = await fetch(`${API_URL}/api/query`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        const reason = data && (data.reason || data.error) ? (data.reason || data.error) : 'Error en el servidor';
        setMessages((m) => [...m, { role: 'assistant', text: `Error: ${reason}` }]);
        return;
      }
      if (data.ok) {
        setMessages((m) => [...m, { role: 'assistant', text: data.reply }]);
        if (data.session_id) setSessionId(data.session_id);
        loadSessions();
        // Only speak the response if voice mode is enabled AND Azure is ready
        console.log('Response received. voiceModeEnabled:', voiceModeEnabled, 'azureReady:', azureReady);
        try {
          speakTextWithAzure(data.reply, voiceModeEnabled);
        } catch (e) {
          console.error('Error calling speakTextWithAzure:', e);
        }
      } else {
        setMessages((m) => [...m, { role: 'assistant', text: `Rechazado: ${data.reason || 'Entrada no válida'}` }]);
      }
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: `Error de red: ${err.message}` }]);
    }
  };

  const handleSend = () => sendQuery({ text: input, files: selectedFiles, viaVoice: false });

  const cleanTextForSpeech = (text) => {
    // Remove special characters and markdown formatting for more natural speech
    return text
      .replace(/\*\*/g, '') // bold markdown
      .replace(/\*/g, '') // italic/bold markdown
      .replace(/_/g, '') // italic markdown
      .replace(/`{1,3}/g, '') // inline code
      .replace(/#+\s/g, '') // headings
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // links [text](url)
      .replace(/\n\n+/g, '. ') // replace multiple newlines with period and space
      .replace(/\n/g, ' '); // replace single newlines with space
  };

  const speakTextWithAzure = (text, shouldSpeak = true) => {
    // If we shouldn't speak, don't start new speech
    if (!shouldSpeak) {
      console.log('Voice mode disabled, not speaking');
      return;
    }
    
    const ref = azureSynthRef.current;
    if (!ref) {
      const synth = window.speechSynthesis;
      if (synth) {
        const utter = new SpeechSynthesisUtterance(cleanTextForSpeech(text));
        utter.lang = 'es-ES';
        synth.cancel();
        synth.speak(utter);
      } else {
        console.log('Speech synthesis not available');
      }
      return;
    }
    
    try {
      const { sdk, speechConfig } = ref;
      const cleanText = cleanTextForSpeech(text);
      console.log('Starting speech synthesis with text:', cleanText.substring(0, 50) + '...');
      
      const audioConfig = sdk.AudioConfig.fromDefaultSpeakerOutput();
      const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
      
      // Capture the current token to validate completion later
      const currentToken = synthesizerTokenRef.current;
      
      // Store reference so we can cancel if needed
      synthesizerRef.current = synthesizer;
      synthesizer.speakTextAsync(cleanText,
        () => { 
          console.log('Speech synthesis completed');
          // Only complete if this is still the current speech session
          if (synthesizerTokenRef.current === currentToken) {
            synthesizer.close();
            synthesizerRef.current = null;
          }
        },
        (err) => { 
          console.error('TTS error:', err); 
          // Only close if this is still the current speech session
          if (synthesizerTokenRef.current === currentToken) {
            synthesizer.close();
            synthesizerRef.current = null;
          }
        }
      );
    } catch (err) {
      console.error('Error in speakTextWithAzure:', err);
    }
  };

  const startVoice = async () => {
    // Toggle behaviour: if voice mode is enabled, disable it
    if (voiceModeEnabled) {
      stopSpeechPlayback();
      
      // stop Azure recognizer if present
      if (azureReady && azureRecognizerRef.current) {
        try { azureRecognizerRef.current.recognizer.stopContinuousRecognitionAsync(); } catch (e) {}
      }
      // stop web recognizer if present
      if (webRecRef.current) {
        try { webRecRef.current.stop(); } catch (e) {}
        webRecRef.current = null;
      }
      setIsListening(false);
      setVoiceModeEnabled(false);
      return;
    }

    // Enable voice mode and start listening
    setVoiceModeEnabled(true);

    // Start Azure continuous recognition if available
    if (azureReady && azureRecognizerRef.current) {
      const { recognizer } = azureRecognizerRef.current;
      setIsListening(true);
      transcriptRef.current = '';

      recognizer.recognizing = (s, e) => {
        if (e.result && e.result.text) {
          const partial = e.result.text;
          const base = transcriptRef.current ? `${transcriptRef.current} ` : '';
          setInput(`${base}${partial}`.trim());
        }
      };
      recognizer.recognized = (s, e) => {
        if (e.result && e.result.text) {
          const txt = e.result.text.trim();
          if (txt) {
            transcriptRef.current = transcriptRef.current ? `${transcriptRef.current} ${txt}` : txt;
            setInput(transcriptRef.current);
          }
        }
      };
      recognizer.canceled = () => { setIsListening(false); };
      recognizer.sessionStopped = () => { setIsListening(false); };
      recognizer.startContinuousRecognitionAsync();
      return;
    }

    // Fallback: Web Speech API
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) return alert('Voz no soportada en este navegador');
    const rec = new Speech();
    rec.lang = 'es-ES';
    rec.interimResults = true;
    rec.continuous = true;
    webRecRef.current = rec;
    setIsListening(true);
    transcriptRef.current = '';
    rec.onresult = (e) => {
      let finalText = '';
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) {
          finalText += res[0].transcript;
        } else {
          interimText += res[0].transcript;
        }
      }
      if (finalText) {
        transcriptRef.current = transcriptRef.current ? `${transcriptRef.current} ${finalText}` : finalText;
      }
      const base = transcriptRef.current ? `${transcriptRef.current} ` : '';
      setInput(`${base}${interimText}`.trim());
    };
    rec.onerror = () => { setIsListening(false); setVoiceModeEnabled(false); webRecRef.current = null; };
    rec.onend = () => {
      if (voiceModeEnabled) {
        try { rec.start(); } catch (e) {}
      } else {
        setIsListening(false);
        webRecRef.current = null;
      }
    };
    rec.start();
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#020617', color: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Sidebar Profesional */}
      <aside style={{ width: '280px', backgroundColor: '#0f172a', borderRight: '1px solid #1e293b', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
          <div style={{ backgroundColor: '#2563eb', padding: '0.5rem', borderRadius: '0.75rem' }}><IconBot /></div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', tracking: '-0.05em', margin: 0 }}>NOVA</h1>
        </div>

        <button
          onClick={async () => {
            stopSpeechPlayback();
            setVoiceModeEnabled(false);
            await createNewSession();
          }}
          style={{
            width: '100%', padding: '0.8rem', backgroundColor: 'rgba(255,255,255,0.05)',
            color: 'white', border: '1px solid #334155', borderRadius: '0.75rem',
            cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '2rem'
          }}
        >
          + NUEVA CONSULTA
        </button>

          <div style={{ flex: 1, overflowY: 'auto' }}>
          <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '800', letterSpacing: '0.1rem', marginBottom: '1rem' }}>RECIENTES</p>
            {sessions.length === 0 && (
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', padding: '0.5rem', borderRadius: '0.5rem' }}>Sin sesiones</div>
            )}
            {sessions.map((s) => (
              <div
                key={s.id}
                onClick={async () => {
                  stopSpeechPlayback();
                  setSessionId(s.id);
                  await loadSessionMessages(s.id);
                }}
                style={{
                  fontSize: '0.8rem',
                  color: s.id === sessionId ? '#e2e8f0' : '#94a3b8',
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  backgroundColor: s.id === sessionId ? 'rgba(255,255,255,0.08)' : 'transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{formatSessionName(s)}</span>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      stopSpeechPlayback();
                      try {
                        const res = await fetch(`${API_URL}/api/sessions/${s.id}`, { method: 'DELETE' });
                        const data = await res.json();
                        if (data.ok && s.id === sessionId) {
                          setVoiceModeEnabled(false);
                          await createNewSession();
                        } else {
                          loadSessions();
                        }
                      } catch (err) {
                        console.warn('No se pudo eliminar la sesión:', err.message);
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                    title="Eliminar sesión"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>

        {/* Header con efecto Blur */}
        <header style={{
          height: '80px', borderBottom: '1px solid #1e293b', display: 'flex',
          alignItems: 'center', padding: '0 3rem', backgroundColor: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(10px)', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '10px', height: '10px', backgroundColor: '#22c55e', borderRadius: '50%', boxShadow: '0 0 10px #22c55e' }}></div>
            <span style={{ fontWeight: '700', letterSpacing: '0.05rem', fontSize: '0.9rem' }}>SISTEMA ACTIVO</span>
          </div>
        </header>

        {/* Mensajes */}
        <section style={{ flex: 1, overflowY: 'auto', padding: '2rem 0' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {messages.map((m, i) => (
              <ChatMessage key={i} role={m.role} text={m.text} fileName={m.fileName} />
            ))}
            <div ref={scrollRef} />
          </div>
        </section>

        {/* Input Barra Flotante */}
        <section style={{ padding: '2rem 3rem' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {selectedFiles.length > 0 && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#60a5fa',
                padding: '0.5rem 1rem', borderRadius: '0.75rem', marginBottom: '1rem',
                fontSize: '0.75rem', border: '1px solid rgba(37, 99, 235, 0.2)'
              }}>
                📄 {selectedFiles.map(f => f.name).join(', ')}
                <button onClick={() => setSelectedFiles([])} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', marginLeft: '0.5rem' }}>✕</button>
              </div>
            )}

            <div style={{
              backgroundColor: '#1e293b', padding: '0.75rem', borderRadius: '1.25rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              border: '1px solid #334155'
            }}>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                  accept=".pdf,.docx,image/*"
                multiple
              />
              <button onClick={() => fileInputRef.current.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', color: '#94a3b8' }}><IconClip /></button>

              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Escribe un comando o adjunta un archivo..."
                style={{ flex: 1, background: 'none', border: 'none', color: 'white', outline: 'none', padding: '0.5rem', fontSize: '1rem' }}
              />

              <button onClick={startVoice} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem',
                color: voiceModeEnabled ? '#ef4444' : '#94a3b8',
                transition: 'all 0.3s'
              }}><IconMic /></button>

              <button
                onClick={handleSend}
                style={{
                  padding: '0.7rem 1.2rem', backgroundColor: '#2563eb', color: 'white',
                  border: 'none', borderRadius: '0.75rem', cursor: 'pointer',
                  fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}
              >
                <IconSend />
              </button>
            </div>
            <p style={{ textAlign: 'center', fontSize: '0.6rem', color: '#475569', marginTop: '1rem', letterSpacing: '0.2rem' }}>NOVA INTERFACE v1.0</p>
          </div>
        </section>
      </main>
    </div>
  );
}
