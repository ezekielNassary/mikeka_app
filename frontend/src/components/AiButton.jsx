export default function AiButton({ onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-bold text-ink-950 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
    >
      <span className="ai-gradient absolute inset-0 rounded-xl" />
      <span className="ai-glow absolute -inset-1 rounded-2xl ai-gradient blur-md" />
      <span className="relative flex items-center gap-2">
        <svg className="ai-spark w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l1.9 5.2L19 9l-5.1 1.8L12 16l-1.9-5.2L5 9l5.1-1.8L12 2z" />
          <path d="M19 14l.9 2.4L22 17l-2.1.7L19 20l-.9-2.3L16 17l2.1-.6L19 14z" opacity="0.85" />
        </svg>
        <span className="text-sm whitespace-nowrap">Auto AI Slip</span>
      </span>
    </button>
  );
}
