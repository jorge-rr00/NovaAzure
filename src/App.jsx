import React, { useState, useRef, useEffect } from 'react';
import * as LottieModule from 'lottie-react';
import './App.css';
import aiRobot from './assets/AI Robot.json';

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
const IconSpeaker = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15 9a4 4 0 0 1 0 6"/><path d="M19 7a8 8 0 0 1 0 10"/></svg>
);
const IconSend = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
);

const escapeHtml = (value) => {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const renderInlineMarkdown = (value) => {
  const safe = escapeHtml(value || '');
  const withBold = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return withBold.replace(/\n/g, '<br />');
};

const ChatMessage = ({ role, text, fileName }) => {
  const isMonospace = typeof text === 'string' && (text.includes('\n') || text.includes('|') || text.includes('##'));
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
        {isMonospace ? (
          <div
            style={{
              margin: 0,
              lineHeight: '1.45',
              fontSize: '0.95rem',
              whiteSpace: 'pre-wrap',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace',
              background: 'rgba(0,0,0,0.05)',
              padding: '0.6rem',
              borderRadius: '0.5rem'
            }}
            dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(text) }}
          />
        ) : (
          <p
            style={{ margin: 0, lineHeight: '1.5', fontSize: '0.95rem' }}
            dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(text) }}
          />
        )}
        <div style={{ fontSize: '0.6rem', opacity: 0.5, marginTop: '0.5rem', textAlign: role === 'user' ? 'right' : 'left' }}>
          {role === 'user' ? 'ENVIADO' : 'NOVA CORE'}
        </div>
      </div>
    </div>
  );
};

const LottieComponent = LottieModule.default || LottieModule.Lottie;

export default function App() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Sistemas NOVA activos. Lista para procesar texto, voz o documentos. ¿En qué puedo ayudarte?' }
  ]);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [input, setInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);
  const azureRecognizerRef = useRef(null);
  const webRecRef = useRef(null);
  const audioRef = useRef(null);
  const audioUrlRef = useRef('');
  const ttsAbortRef = useRef(null);
  const lottieRef = useRef(null);
  const [azureReady, setAzureReady] = useState(false);
  const transcriptRef = useRef('');

  const API_URL = import.meta.env.VITE_API_URL || '';
  const botState = isListening ? 'listening' : isLoading ? 'thinking' : isSpeaking ? 'speaking' : 'idle';

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!lottieRef.current) return;
    const speedMap = {
      idle: 0.8,
      listening: 1.15,
      thinking: 1.25,
      speaking: 1.35
    };
    const speed = speedMap[botState] || 1;
    try {
      lottieRef.current.setSpeed(speed);
    } catch (e) {}
  }, [botState]);

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
        const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
        const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
        azureRecognizerRef.current = { sdk: SpeechSDK, recognizer };
        setAzureReady(true);
      } catch (e) {
        console.warn('Azure Speech SDK no disponible:', e.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const stopSpeechPlayback = () => {
    if (ttsAbortRef.current) {
      try { ttsAbortRef.current.abort(); } catch (e) {}
      ttsAbortRef.current = null;
    }
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (e) {}
    }
    if (audioUrlRef.current) {
      try { URL.revokeObjectURL(audioUrlRef.current); } catch (e) {}
      audioUrlRef.current = '';
    }
    setIsSpeaking(false);
  };

  useEffect(() => {
    if (!speakerEnabled) {
      stopSpeechPlayback();
    }
  }, [speakerEnabled]);

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

  const getSessionId = (s) => s?.id || s?.session_id || '';

  const formatSessionName = (s) => {
    const createdAt = s?.created_at || s?.createdAt;
    if (!createdAt) return 'Nova-Sesion';
    const dt = new Date(createdAt);
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
        stopSpeechPlayback();
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
    if (speakerEnabled) form.append('voice_mode', 'true');
    files.forEach((f) => form.append('files', f));

    // reset input/files in UI
    setInput('');
    if (isListening || viaVoice) {
      transcriptRef.current = '';
    }
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = null;

    setIsLoading(true);
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
        console.log('Response received. speakerEnabled:', speakerEnabled, 'azureReady:', azureReady);
        try {
          speakTextWithAzure(data.reply, speakerEnabled);
        } catch (e) {
          console.error('Error calling speakTextWithAzure:', e);
        }
      } else {
        setMessages((m) => [...m, { role: 'assistant', text: `Rechazado: ${data.reason || 'Entrada no válida'}` }]);
      }
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: `Error de red: ${err.message}` }]);
    } finally {
      setIsLoading(false);
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

  const speakTextWithAzure = async (text, shouldSpeak = true) => {
    // If we shouldn't speak, don't start new speech
    if (!shouldSpeak) {
      console.log('Voice mode disabled, not speaking');
      return;
    }

    const clean = cleanTextForSpeech(text || '');
    if (!clean) return;
    stopSpeechPlayback();

    const controller = new AbortController();
    ttsAbortRef.current = controller;

    try {
      const res = await fetch(`${API_URL}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean }),
        signal: controller.signal
      });
      if (!res.ok) return;
      const blob = await res.blob();
      if (!speakerEnabled) return;

      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      audioRef.current.src = url;
      audioRef.current.onended = () => {
        setIsSpeaking(false);
        stopSpeechPlayback();
      };
      setIsSpeaking(true);
      await audioRef.current.play();
    } catch (e) {
      setIsSpeaking(false);
      // ignore aborted or playback errors
    }
  };

  const toggleListening = async () => {
    // Toggle behaviour: if listening, stop the recognizers
    if (isListening) {
      if (azureReady && azureRecognizerRef.current) {
        try { azureRecognizerRef.current.recognizer.stopContinuousRecognitionAsync(); } catch (e) {}
      }
      if (webRecRef.current) {
        try { webRecRef.current.stop(); } catch (e) {}
        webRecRef.current = null;
      }
      setIsListening(false);
      return;
    }

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
    rec.onerror = () => { setIsListening(false); webRecRef.current = null; };
    rec.onend = () => {
      if (isListening) {
        try { rec.start(); } catch (e) {}
      } else {
        setIsListening(false);
        webRecRef.current = null;
      }
    };
    rec.start();
  };

  const toggleSpeaker = () => {
    setSpeakerEnabled((prev) => !prev);
    if (speakerEnabled) {
      stopSpeechPlayback();
    }
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
            setSpeakerEnabled(false);
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

        <button
          onClick={async () => {
            stopSpeechPlayback();
            setSpeakerEnabled(false);
            try {
              const res = await fetch(`${API_URL}/api/sessions`, { method: 'DELETE' });
              const data = await res.json();
              if (data.ok) {
                await createNewSession();
              }
            } catch (e) {
              setMessages([{ role: 'assistant', text: 'Error eliminando historial.' }]);
            }
          }}
          style={{
            width: '100%', padding: '0.6rem', backgroundColor: 'rgba(239,68,68,0.08)',
            color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '0.75rem',
            cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', marginBottom: '1.5rem'
          }}
        >
          BORRAR HISTORIAL
        </button>

          <div style={{ flex: 1, overflowY: 'auto' }}>
          <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '800', letterSpacing: '0.1rem', marginBottom: '1rem' }}>RECIENTES</p>
            {sessions.length === 0 && (
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', padding: '0.5rem', borderRadius: '0.5rem' }}>Sin sesiones</div>
            )}
            {sessions.map((s) => (
              <div
                key={getSessionId(s)}
                onClick={async () => {
                  stopSpeechPlayback();
                  const sid = getSessionId(s);
                  setSessionId(sid);
                  await loadSessionMessages(sid);
                }}
                style={{
                  fontSize: '0.8rem',
                  color: getSessionId(s) === sessionId ? '#e2e8f0' : '#94a3b8',
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  backgroundColor: getSessionId(s) === sessionId ? 'rgba(255,255,255,0.08)' : 'transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{formatSessionName(s)}</span>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      stopSpeechPlayback();
                      try {
                        const sid = getSessionId(s);
                        const res = await fetch(`${API_URL}/api/sessions/${sid}`, { method: 'DELETE' });
                        const data = await res.json();
                        if (data.ok && sid === sessionId) {
                          setSpeakerEnabled(false);
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
          <div className="nova-chat-layout">
            <div className="nova-chat-stream">
              {messages.map((m, i) => (
                <ChatMessage key={i} role={m.role} text={m.text} fileName={m.fileName} />
              ))}
              {isLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1.5rem', padding: '0 1rem' }}>
                  <div style={{
                    maxWidth: '75%', padding: '1.2rem', borderRadius: '1.5rem 1.5rem 1.5rem 0',
                    backgroundColor: '#1e293b', color: 'white', border: '1px solid #334155',
                    display: 'flex', alignItems: 'center', gap: '0.6rem'
                  }}>
                    <span className="nova-spinner" />
                    <span className="nova-thinking" style={{ fontSize: '0.9rem' }}>Pensando...</span>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
            <div className="nova-bot-panel">
              <div className={`nova-bot-card nova-bot-${botState}`}>
                <div className="nova-bot-title">NOVA</div>
                <div className="nova-bot-state">
                  {botState === 'listening' && 'Escuchando'}
                  {botState === 'thinking' && 'Pensando'}
                  {botState === 'speaking' && 'Hablando'}
                  {botState === 'idle' && 'En espera'}
                </div>
                {LottieComponent && (
                  <LottieComponent
                    lottieRef={lottieRef}
                    animationData={aiRobot}
                    loop
                    autoplay
                    className="nova-bot-lottie"
                  />
                )}
              </div>
            </div>
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

              <button onClick={toggleListening} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem',
                color: isListening ? '#ef4444' : '#94a3b8',
                transition: 'all 0.3s'
              }} title={isListening ? 'Detener microfono' : 'Activar microfono'}><IconMic /></button>

              <button onClick={toggleSpeaker} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem',
                color: speakerEnabled ? '#22c55e' : '#94a3b8',
                transition: 'all 0.3s'
              }} title={speakerEnabled ? 'Desactivar altavoz' : 'Activar altavoz'}><IconSpeaker /></button>

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
