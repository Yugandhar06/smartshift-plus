import React, { useState, useEffect, useRef } from 'react';
import { SS } from '../utils/shared';

const ChatAssistantWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', text: 'Namaskara Ravi! I am your Safar AI Assistant  I speak Hindi, Kannada, and English. How can I protect your earnings today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      // Remove emojis to prevent the reader from saying "smiling face"
      const cleanText = text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      window.speechSynthesis.speak(utterance);
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Speech Recognition.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN'; 
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
    
    recognition.onspeechend = () => recognition.stop();
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { id: Date.now(), sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    const messageText = input;
    setInput('');
    setIsTyping(true);

    try {
      // Connect to the real backend API instead of simulating!
      const currentWorkerId = SS.get('worker_id') || 1;
      const res = await fetch('http://localhost:8000/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: parseInt(currentWorkerId), message: messageText })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: data.reply }]);
        speak(data.reply);
      } else {
        setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: 'Sorry, I encountered an error checking your profile.' }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: 'Server connection failed. Is the API running?' }]);
    }

    setIsTyping(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontFamily: 'sans-serif' }}>
      
      {/* Chat Window */}
      {isOpen && (
        <div style={{ 
          width: '320px', 
          height: '420px', 
          backgroundColor: '#0f111a', 
          borderRadius: '16px', 
          boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
          border: '1px solid #2d3345',
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUp 0.3s ease-out'
        }}>
          {/* Header */}
          <div style={{ padding: '16px', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%', boxShadow: '0 0 10px #fff' }}></div>
              <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '15px' }}>Safar AI Copilot</div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', padding: 0 }}>&times;</button>
          </div>

          {/* Messages Area */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', background: '#0a0b10' }}>
            {messages.map(msg => (
               <div key={msg.id} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                 <div style={{ 
                   background: msg.sender === 'user' ? '#1e5fdf' : '#222632', 
                   color: '#fff', 
                   padding: '10px 14px', 
                   borderRadius: msg.sender === 'user' ? '14px 14px 0 14px' : '14px 14px 14px 0',
                   fontSize: '14px',
                   lineHeight: '1.4',
                   boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                 }}>
                   {msg.text}
                 </div>
                 <div style={{ fontSize: '10px', color: '#687083', marginTop: '4px', textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
                   {msg.sender === 'user' ? 'You' : 'SafarAI'}
                 </div>
               </div>
            ))}
            {isTyping && (
              <div style={{ alignSelf: 'flex-start', background: '#222632', padding: '10px 14px', borderRadius: '14px 14px 14px 0' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <div className="typing-dot" style={{ width: '6px', height: '6px', background: '#848d9f', borderRadius: '50%' }}></div>
                  <div className="typing-dot" style={{ width: '6px', height: '6px', background: '#848d9f', borderRadius: '50%' }}></div>
                  <div className="typing-dot" style={{ width: '6px', height: '6px', background: '#848d9f', borderRadius: '50%' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{ padding: '12px', background: '#1c1f2b', borderTop: '1px solid #2d3345', display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Mic button (visual & functional) */}
            <button 
              onClick={startListening}
              style={{ background: isListening ? '#ff5252' : '#2d3345', border: 'none', width: '36px', height: '36px', borderRadius: '50%', color: isListening ? '#fff' : '#00e676', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.3s' }}>
              
            </button>
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening..." : "Ask in Hindi, Kannada..."}
              style={{ flex: 1, background: '#0a0b10', border: '1px solid #2d3345', color: '#fff', padding: '10px 14px', borderRadius: '20px', outline: 'none', fontSize: '13px' }}
            />
            <button 
              onClick={handleSend}
              style={{ background: '#1e5fdf', border: 'none', width: '36px', height: '36px', borderRadius: '50%', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              
            </button>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          border: '4px solid #0f111a',
          boxShadow: '0 8px 24px rgba(0, 242, 254, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          transition: 'transform 0.2s',
          transform: isOpen ? 'scale(0.9)' : 'scale(1)'
        }}
      >
        {isOpen ? '' : ''}
      </button>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .typing-dot {
          animation: blink 1.4s infinite both;
        }
        .typing-dot:nth-child(1) { animation-delay: 0s; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink {
          0% { opacity: 0.2; transform: scale(0.8); }
          20% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0.2; transform: scale(0.8); }
        }
      `}} />
    </div>
  );
};

export default ChatAssistantWidget;