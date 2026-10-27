
import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, Send, Minimize2 } from 'lucide-react';
import './FloatingMediBot.css';

const API_URL = 'http://127.0.0.1:8000/api/v1/chat';
const MAX_QUESTION_LENGTH = 1000;
const STORAGE_KEY = 'swasthsetu-dashboard-medibot-chat';

// Correct filename: your image is medibot-avatar.jpg
const ROBOT_IMAGE = '/images/medibot-avatar.jpg';

const createId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const getSafetyMessage = (question) => {
  const text = question.toLowerCase().trim();

  if (
    /\b(do i have|diagnose me|can you diagnose|what disease do i have|what condition do i have|what is my diagnosis)\b/.test(text)
  ) {
    return 'I can explain health conditions for educational purposes, but I cannot diagnose you. Please consult a qualified healthcare professional.';
  }

  if (
    /\b(prescribe|which medicine should i take|what medicine should i take|what dosage should i take|how much medicine should i take)\b/.test(text)
  ) {
    return 'I can provide general educational information about medicines, but I cannot prescribe medicines or recommend personal doses. Please consult a qualified healthcare professional.';
  }

  return null;
};

const loadMessages = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed)
      ? parsed.filter(
          (message) =>
            message &&
            ['user', 'assistant'].includes(message.role) &&
            typeof message.content === 'string'
        )
      : [];
  } catch {
    return [];
  }
};

export default function FloatingMediBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(loadMessages);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (err) {
      console.warn('Could not save dashboard MediBot chat:', err);
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [isOpen, messages, loading, error]);

  const handleNewChat = () => {
    if (loading) return;
    setMessages([]);
    setQuestion('');
    setError('');
  };

  const handleSend = async (event) => {
    event?.preventDefault();

    const currentQuestion = question.trim();

    if (!currentQuestion || loading) return;

    setQuestion('');
    setError('');

    const userMessage = {
      id: createId(),
      role: 'user',
      content: currentQuestion,
    };

    const safetyMessage = getSafetyMessage(currentQuestion);

    if (safetyMessage) {
      setMessages((previous) => [
        ...previous,
        userMessage,
        {
          id: createId(),
          role: 'assistant',
          content: safetyMessage,
        },
      ]);
      return;
    }

    const history = messages.map(({ role, content }) => ({
      role,
      content,
    }));

    setMessages((previous) => [...previous, userMessage]);
    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion.slice(0, MAX_QUESTION_LENGTH),
          history,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('MediBot API error:', responseData);
        throw new Error(`Request failed (${response.status})`);
      }

      const answer = responseData?.data?.answer;

      if (
        !responseData?.success ||
        typeof answer !== 'string' ||
        !answer.trim()
      ) {
        throw new Error('MediBot returned an invalid response.');
      }

      setMessages((previous) => [
        ...previous,
        {
          id: createId(),
          role: 'assistant',
          content: answer,
        },
      ]);
    } catch (err) {
      console.error('Dashboard MediBot error:', err);
      setError(
        "MediBot couldn't connect right now. Please check that the assistant server is running and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="floating-medibot">
      {isOpen && (
        <section
          className="floating-medibot-panel"
          aria-label="MediBot chat"
        >
          <header className="floating-medibot-header">
            <div className="floating-medibot-heading">
              <span className="floating-medibot-avatar">
                <img
                  src={ROBOT_IMAGE}
                  alt="MediBot robot"
                  className="floating-medibot-robot"
                />
              </span>

              <div>
                <strong>MediBot</strong>
                <span className="floating-medibot-online">
                  <span />
                  Health education assistant
                </span>
              </div>
            </div>

            <div className="floating-medibot-header-actions">
              <button
                type="button"
                onClick={handleNewChat}
                disabled={loading}
                title="New chat"
                aria-label="New chat"
                className="floating-medibot-icon-button"
              >
                <Minimize2 size={17} />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close chat"
                aria-label="Close MediBot"
                className="floating-medibot-icon-button"
              >
                <X size={20} />
              </button>
            </div>
          </header>

          <div className="floating-medibot-messages">
            {messages.length === 0 && (
              <div className="floating-medibot-welcome">
                <span className="floating-medibot-welcome-icon">
                  <img
                    src={ROBOT_IMAGE}
                    alt="MediBot robot"
                    className="floating-medibot-robot"
                  />
                </span>

                <h3>Hello! How can I help?</h3>
                <p>
                  Ask me about health topics, blood tests, or general
                  medical information.
                </p>

                <button
                  type="button"
                  onClick={() => setQuestion('What is hemoglobin?')}
                >
                  What is hemoglobin?
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setQuestion('What does a CBC blood test measure?')
                  }
                >
                  Explain a CBC test
                </button>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`floating-medibot-message ${message.role}`}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            ))}

            {loading && (
              <div className="floating-medibot-message assistant">
                <span className="floating-medibot-dots">
                  MediBot is thinking
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </span>
              </div>
            )}

            {error && (
              <div className="floating-medibot-error" role="alert">
                {error}
                <button type="button" onClick={() => setError('')}>
                  Dismiss
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form
            className="floating-medibot-input-area"
            onSubmit={handleSend}
          >
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask MediBot..."
              aria-label="Ask MediBot a question"
              maxLength={MAX_QUESTION_LENGTH}
              disabled={loading}
            />

            <button
              type="submit"
              disabled={loading || !question.trim()}
              aria-label="Send message"
              title="Send message"
            >
              <Send size={18} />
            </button>
          </form>

          <p className="floating-medibot-disclaimer">
            General health education only. Not a substitute for medical advice.
          </p>
        </section>
      )}

      <button
        type="button"
        className="floating-medibot-launcher"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label={isOpen ? 'Close MediBot chat' : 'Open MediBot chat'}
        aria-expanded={isOpen}
        title="Chat with MediBot"
      >
        {isOpen ? (
          <X size={27} />
        ) : (
          <img
            src={ROBOT_IMAGE}
            alt="MediBot"
            className="floating-medibot-robot"
          />
        )}

        {!isOpen && (
          <span className="floating-medibot-badge">1</span>
        )}
      </button>
    </div>
  );
}
