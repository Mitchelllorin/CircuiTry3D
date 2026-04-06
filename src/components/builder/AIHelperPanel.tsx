import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildGreeting,
  getAIResponse,
  SUGGESTED_QUESTIONS,
} from "../../services/aiHelperService";
import type { LegacyCircuitState } from "../builder/types";
import "../../styles/ai-helper.css";

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
}

type PanelSize = "normal" | "minimized" | "maximized";

interface AIHelperPanelProps {
  isOpen: boolean;
  circuitState: LegacyCircuitState | null;
  onClose: () => void;
}

let _msgId = 0;
function nextId() {
  return ++_msgId;
}

export function AIHelperPanel({ isOpen, circuitState, onClose }: AIHelperPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [panelSize, setPanelSize] = useState<PanelSize>("normal");
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const didGreetRef = useRef(false);

  // Post initial greeting when panel first opens
  useEffect(() => {
    if (isOpen && !didGreetRef.current) {
      didGreetRef.current = true;
      const greeting = buildGreeting(circuitState);
      setMessages([{ id: nextId(), role: "assistant", text: greeting }]);
    }
  }, [isOpen, circuitState]);

  // Update greeting text if circuit state changes while panel is open and no
  // conversation has started yet (still only the initial greeting message).
  useEffect(() => {
    if (!isOpen) return;
    if (messages.length !== 1) return;
    const greeting = buildGreeting(circuitState);
    // Update the text of the existing greeting message in-place (preserve id)
    // to avoid unnecessary re-renders.
    setMessages((prev) => {
      if (prev.length !== 1) return prev;
      const existing = prev[0];
      if (existing.text === greeting) return prev;
      return [{ ...existing, text: greeting }];
    });
    // intentionally omit `messages` from deps to avoid infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circuitState, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setPanelSize("normal");
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  const handleMinimize = () =>
    setPanelSize((s) => (s === "minimized" ? "normal" : "minimized"));

  const handleMaximize = () =>
    setPanelSize((s) => (s === "maximized" ? "normal" : "maximized"));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isTyping) return;
      setInputValue("");
      setShowSuggestions(false);
      setMessages((prev) => [...prev, { id: nextId(), role: "user", text: trimmed }]);
      setIsTyping(true);

      const delay = 550 + Math.random() * 450;
      setTimeout(() => {
        const answer = getAIResponse(trimmed, circuitState);
        setIsTyping(false);
        setMessages((prev) => [...prev, { id: nextId(), role: "assistant", text: answer }]);
      }, delay);
    },
    [circuitState, isTyping],
  );

  const handleSend = () => sendMessage(inputValue);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePanelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop — tap anywhere outside the panel to dismiss */}
      <div
        className="ai-helper-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`ai-helper-panel${panelSize !== "normal" ? ` ai-helper-panel--${panelSize}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Circuit AI assistant"
        onKeyDown={handlePanelKeyDown}
      >
        {/* Header */}
        <div className="ai-helper-panel__header">
          <span className="ai-helper-panel__header-icon" aria-hidden="true">
            ⚡
          </span>
          <div>
            <div className="ai-helper-panel__header-title">Circuit AI</div>
            <div className="ai-helper-panel__header-subtitle">
              Ask anything about circuits or the app
            </div>
          </div>
          {/* Minimize */}
          <button
            type="button"
            className="ai-helper-panel__size-btn"
            onClick={handleMinimize}
            aria-label={panelSize === "minimized" ? "Restore panel" : "Minimize panel"}
            title={panelSize === "minimized" ? "Restore" : "Minimize"}
          >
            {panelSize === "minimized" ? "▲" : "▼"}
          </button>
          {/* Maximize / Restore */}
          <button
            type="button"
            className="ai-helper-panel__size-btn"
            onClick={handleMaximize}
            aria-label={panelSize === "maximized" ? "Restore panel" : "Maximize panel"}
            title={panelSize === "maximized" ? "Restore" : "Maximize"}
          >
            {panelSize === "maximized" ? "⊡" : "⊞"}
          </button>
          <button
            type="button"
            className="ai-helper-panel__close"
            onClick={onClose}
            aria-label="Close Circuit AI"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        {panelSize !== "minimized" && (
        <div className="ai-helper-panel__messages" aria-live="polite" aria-relevant="additions">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`ai-msg ai-msg--${msg.role}`}
            >
              {msg.role === "assistant" && (
                <div className="ai-msg__avatar">⚡ Circuit AI</div>
              )}
              {msg.text}
            </div>
          ))}
          {isTyping && (
            <div className="ai-typing" aria-label="Circuit AI is typing">
              <span className="ai-typing__dot" />
              <span className="ai-typing__dot" />
              <span className="ai-typing__dot" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        )}

        {/* Suggestion chips (only while no back-and-forth has started) */}
        {showSuggestions && panelSize !== "minimized" && (
          <div className="ai-helper-panel__suggestions" aria-label="Suggested questions">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                className="ai-suggestion-chip"
                onClick={() => sendMessage(q)}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        {panelSize !== "minimized" && (
        <div className="ai-helper-panel__input-row">
          <input
            ref={inputRef}
            type="text"
            className="ai-helper-panel__input"
            placeholder="Ask about circuits, Ohm's Law, or the app…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Message to Circuit AI"
            maxLength={500}
            autoComplete="off"
            spellCheck
          />
          <button
            type="button"
            className="ai-helper-panel__send"
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            aria-label="Send message"
            title="Send (Enter)"
          >
            ➤
          </button>
        </div>
        )}
      </div>
    </>
  );
}

export default AIHelperPanel;
