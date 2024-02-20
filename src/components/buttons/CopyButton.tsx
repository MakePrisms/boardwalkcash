import { useState } from "react";
import { useToast } from "@/hooks/useToast";

const iconColor = `text-[var(--foreground-rgb)]`

const clipboardIcon = () => {
  return (
    <svg
      className={`w-6 h-6 ${iconColor} dark:text-white`}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M15 4h3c.6 0 1 .4 1 1v15c0 .6-.4 1-1 1H6a1 1 0 0 1-1-1V5c0-.6.4-1 1-1h3m0 3h6m-6 5h6m-6 4h6M10 3v4h4V3h-4Z"
      />
    </svg>
  );
};

const checkIcon = () => {
  return (
    <svg
      className="w-6 h-6 text-[var(--foreground-rgb)] dark:text-white"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
};

interface Props {
  text: string;
}

const ClipboardButton: React.FC<Props> = ({ text }) => {
  const [isCopied, setIsCopied] = useState(false);

  const { addToast } = useToast();

  const handleCopy = () => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setIsCopied(true);
        addToast("Copied to clipboard", "info");

        setTimeout(() => {
          setIsCopied(false);
        }, 3000);
      })
      .catch((err): void => {
        console.error("Copy failed", err);
        addToast("Failed to copy to clipboard", "error");
      });
  };

  return (
    <button onClick={handleCopy}>
      {isCopied ? checkIcon() : clipboardIcon()}
      <i className="fb-icon fb-icon-clipboard" />
    </button>
  );
};

export default ClipboardButton;
