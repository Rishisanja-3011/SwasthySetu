
import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FaPaperPlane } from 'react-icons/fa';
import { Bot, FileText, Activity, Heart, Utensils } from 'lucide-react';

import { usePatient } from '../context/PatientContext';
import { sendMessageToMediBot } from '../services/mediBotApi';
import './AssistantScreen.css';

const MAX_QUESTION_LENGTH = 1000;

/* Load the previous conversation from browser storage. */
const loadSavedMessages = (storageKey) => {
  try {
    const saved = localStorage.getItem(storageKey);

    if (!saved) return [];

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (message) =>
        message &&
        (message.role === 'user' || message.role === 'assistant') &&
        typeof message.content === 'string'
    );
  } catch (error) {
    console.error('Unable to load saved MediBot conversation:', error);
    return [];
  }
};

/* Basic frontend checks for selected diagnosis and prescription requests. */
const getMedicalSafetyMessage = (question) => {
  const text = question.toLowerCase().trim();

  const diagnosisPatterns = [
    /\bdo i have\b/,
    /\bdiagnose me\b/,
    /\bwhat disease do i have\b/,
    /\bwhat condition do i have\b/,
    /\bconfirm (my )?diagnosis\b/,
    /\btell me my diagnosis\b/,
    /\bwhat is my diagnosis\b/,
    /\bcan you diagnose\b/,
  ];

  const prescriptionPatterns = [
    /\bwhich medicine should i take\b/,
    /\bwhat medicine should i take\b/,
    /\bwhat medication should i take\b/,
    /\bprescribe\b/,
    /\bwhat dosage should i take\b/,
    /\bhow much medicine should i take\b/,
    /\bshould i start taking\b/,
    /\bshould i stop taking\b/,
    /\bchange my medication\b/,
    /\bwhich drug should i take\b/,
  ];

  if (diagnosisPatterns.some((pattern) => pattern.test(text))) {
    return (
      'I can explain health conditions and medical information ' +
      'for educational purposes, but I cannot diagnose you. ' +
      'Please consult a qualified healthcare professional.'
    );
  }

  if (prescriptionPatterns.some((pattern) => pattern.test(text))) {
    return (
      'I can provide general educational information about medicines, ' +
      'but I cannot prescribe medicines or recommend personal doses. ' +
      'Please consult a qualified healthcare professional for treatment advice.'
    );
  }

  return null;
};

/* Detect explicit food, diet, and meal questions. */
const isNutritionQuestion = (question) => {
  const explicitFoodIntent =
    /\b(food|foods|diet|diets|meal|meals|eat|eating|recipe|recipes|breakfast|lunch|dinner|snack|snacks|vegetarian|vegan|non-vegetarian|nonvegetarian|food plan|meal plan|diet plan|nutrition plan|what should i eat|what to eat|which foods|foods to include|foods to avoid|food sources|sources of vitamin|sources of iron|rich in iron|rich in vitamin)\b/i;

  return explicitFoodIntent.test(question.toLowerCase().trim());
};

/* Keep the outgoing question within the backend's 1,000-character limit. */
const prepareQuestionForMediBot = (question) => {
  if (!isNutritionQuestion(question)) {
    return question.slice(0, MAX_QUESTION_LENGTH);
  }

  const instructions =
    '\n\nUse clear Markdown headings and bullet lists. For nutrition, ' +
    'include relevant vegetarian and non-vegetarian foods, daily meal ' +
    'ideas, and nutrient absorption. Separate meals under individual ' +
    'headings. Avoid tables and pipe characters. Be concise. Do not ' +
    'assume the cause of low hemoglobin or prescribe medicines.';

  const availableLength =
    MAX_QUESTION_LENGTH - instructions.length;

  return question.slice(0, availableLength) + instructions;
};

/* Convert common malformed pipe-separated tables into readable lists. */
const formatAssistantResponse = (content) => {
  if (typeof content !== 'string') return '';

  return content
    .split('\n')
    .map((line) => {
      if (!line.includes('|') || !/-{3,}/.test(line)) {
        return line;
      }

      const cells = line
        .split('|')
        .map((cell) => cell.trim())
        .filter(Boolean);

      const separatorIndex = cells.findIndex((cell) =>
        /^:?-{3,}:?$/.test(cell.replace(/\s/g, ''))
      );

      if (separatorIndex < 1) return line;

      const headers = cells.slice(0, separatorIndex);
      const dataCells = cells
        .slice(separatorIndex + 1)
        .filter((cell) => !/^:?-{3,}:?$/.test(cell));

      if (headers.length < 2 || dataCells.length < headers.length) {
        return line;
      }

      const formattedRows = [];

      for (let i = 0; i < dataCells.length; i += headers.length) {
        const row = dataCells.slice(i, i + headers.length);

        if (row.length !== headers.length) {
          formattedRows.push(`- ${row.join(' — ')}`);
          continue;
        }

        formattedRows.push(
          `- **${row[0]}:** ${row
            .slice(1)
            .map(
              (value, index) => `${headers[index + 1]}: ${value}`
            )
            .join('; ')}`
        );
      }

      return `**${headers.join(' / ')}**\n\n${formattedRows.join('\n')}`;
    })
    .join('\n');
};

const createMessageId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function AssistantScreen() {
  const { patient } = usePatient();
  const storageKey = useMemo(
    () => `swasthsetu-medibot-messages-${patient?.patient_identifier || 'patient'}`,
    [patient?.patient_identifier],
  );

  /*
   * Initialize messages from localStorage.
   * The previous conversation is restored on page refresh.
   */
  const [messages, setMessages] = useState(() => loadSavedMessages(storageKey));
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const questionRef = useRef(null);

  useEffect(() => {
    setMessages(loadSavedMessages(storageKey));
  }, [storageKey]);

  /* Save user and assistant messages whenever the conversation changes. */
  useEffect(() => {
    try {
      const messagesToSave = messages.filter(
        (message) =>
          message.role === 'user' ||
          message.role === 'assistant'
      );

      localStorage.setItem(storageKey, JSON.stringify(messagesToSave));
    } catch (error) {
      console.error('Unable to save MediBot conversation:', error);
    }
  }, [messages, storageKey]);

  /* Scroll to the latest message. */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages, loading]);

  /* Prepare previous conversation history for the API. */
  const getConversationHistory = () =>
    messages
      .filter(
        (message) =>
          message.role === 'user' ||
          message.role === 'assistant'
      )
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

  /* Send the user's question to MediBot. */
  const handleSend = async () => {
    if (!question.trim() || loading) return;

    const currentQuestion = question.trim();
    const safetyMessage = getMedicalSafetyMessage(currentQuestion);

    /* Handle selected safety cases without calling the backend. */
    if (safetyMessage) {
      setMessages((previous) => [
        ...previous,
        {
          id: createMessageId(),
          role: 'user',
          content: currentQuestion,
        },
        {
          id: createMessageId(),
          role: 'assistant',
          content: safetyMessage,
        },
      ]);

      setQuestion('');
      return;
    }

    const conversationHistory = getConversationHistory();

    const userMessage = {
      id: createMessageId(),
      role: 'user',
      content: currentQuestion,
    };

    const thinkingMessage = {
      id: createMessageId(),
      role: 'thinking',
      content: 'MediBot is thinking...',
    };

    setMessages((previous) => [
      ...previous,
      userMessage,
      thinkingMessage,
    ]);

    setQuestion('');
    setLoading(true);

    try {
      const apiQuestion =
        prepareQuestionForMediBot(currentQuestion);

      if (apiQuestion.length > MAX_QUESTION_LENGTH) {
        throw new Error('The question exceeds the API character limit.');
      }

      const aiMessage = await sendMessageToMediBot(
        apiQuestion,
        conversationHistory,
      );

      setMessages((previous) =>
        previous.map((message) =>
          message.id === thinkingMessage.id
            ? {
                id: createMessageId(),
                role: 'assistant',
                content: aiMessage,
              }
            : message
        )
      );
    } catch (error) {
      console.error('Error sending message to MediBot:', error);

      setMessages((previous) =>
        previous.map((message) =>
          message.id === thinkingMessage.id
            ? {
                id: createMessageId(),
                role: 'assistant',
                content:
                  "Sorry, I couldn't process your request right now. Please try again.",
              }
            : message
        )
      );
    } finally {
      setLoading(false);
    }
  };

  /* Enter sends the message. */
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      handleSend();
    }
  };

  /*
   * New Chat clears the current conversation from both the UI
   * and localStorage through the messages persistence effect.
   */
  const handleNewChat = () => {
    if (loading) return;

    setMessages([]);
    setQuestion('');
  };

  const patientFirstName =
    patient?.name?.split(' ')[0] || 'there';

  return (
    <div className="medibot-page">
      {/* Header */}
      <header className="medibot-header">
        <div className="medibot-header-info">
          <div className="medibot-bot-icon"><Bot size={26} /></div>

          <div>
            <h1>MediBot</h1>
            <div className="medibot-status">
              <span className="medibot-status-dot"></span>
              Your health education assistant
            </div>
          </div>
        </div>

        <button
          type="button"
          className="medibot-new-chat"
          onClick={handleNewChat}
          disabled={loading}
        >
          + New Chat
        </button>
      </header>

      {/* Chat window */}
      <div className="medibot-chat-window">
        {messages.length === 0 ? (
          <div className="medibot-empty-chat">
            <div className="medibot-empty-icon"><Bot size={36} /></div>

            <h2>Welcome to MediBot 👋</h2>

            <p className="medibot-empty-description">
              Namaste {patientFirstName}! I am your medical
              education assistant for simple, easy-to-understand
              health information.
            </p>

            <div className="medibot-suggestion-section">
              <p className="medibot-suggestion-title">
                You can ask me about:
              </p>

              <div className="medibot-suggestion-list">
                {[
                  [FileText, 'Blood tests & reports', 'What does a CBC blood test measure?'],
                  [Activity, 'Understanding hemoglobin', 'What is hemoglobin and what does it do?'],
                  [Utensils, 'Nutrition & vitamins', 'Which foods are sources of iron?'],
                  [Heart, 'Everyday health', 'What are some general healthy habits?'],
                ].map(([Icon, label, prompt]) => (
                  <button key={label} type="button" className="medibot-suggestion-item" onClick={() => { setQuestion(prompt); questionRef.current?.focus(); }}>
                    <Icon size={20} /> <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <p className="medibot-medical-note">
              MediBot provides general educational information
              and is not a replacement for a qualified healthcare
              professional.
            </p>
          </div>
        ) : (
          <div className="medibot-messages" role="log" aria-label="Conversation with MediBot" aria-live="polite">
            {/* Hide the static thinking message; keep the animated one below. */}
            {messages
              .filter((message) => message.role !== 'thinking')
              .map((message) => (
                <div
                  key={message.id}
                  className={`medibot-message ${message.role}`}
                >
                  <div className="medibot-message-content">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ children }) => (
                          <div className="medibot-table-wrapper">
                            <table className="medibot-response-table">
                              {children}
                            </table>
                          </div>
                        ),
                      }}
                    >
                      {formatAssistantResponse(message.content)}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}

            {/* Single animated thinking indicator. */}
            {loading && (
              <div className="medibot-message thinking">
                <div className="medibot-message-content">
                  <div className="medibot-thinking-indicator">
                    <span>MediBot is thinking</span>
                    <span className="medibot-thinking-dots">
                      <span>.</span>
                      <span>.</span>
                      <span>.</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message input */}
      <div className="medibot-input-container">
        <div className="medibot-input-wrapper">
          <input
            ref={questionRef}
            type="text"
            aria-label="Your question for MediBot"
            maxLength={MAX_QUESTION_LENGTH}
            placeholder="Ask MediBot anything..."
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={loading || !question.trim()}
            title="Send message"
            aria-label="Send message"
          >
            {loading ? '...' : <FaPaperPlane />}
          </button>
        </div>

        <p className="medibot-input-note">
          MediBot provides educational information and does not
          replace professional medical advice.
        </p>
      </div>
    </div>
  );
}

export default AssistantScreen;
