import { useState } from "react";
import { useToast } from "@/hooks/useToast";
import { Button } from "flowbite-react";
import {
  ClipboardDocumentCheckIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/20/solid";

interface Props {
  toCopy: string;
  toShow: string;
  className?: string;
}

const ClipboardButton: React.FC<Props> = ({
  toCopy,
  toShow,
  className = "",
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const { addToast } = useToast();

  const handleCopy = () => {
    navigator.clipboard
      .writeText(toCopy)
      .then(() => {
        setIsCopied(true);
        addToast("Copied to clipboard", "info");

        setTimeout(() => {
          setIsCopied(false);
        }, 5000);
      })
      .catch((err): void => {
        console.error("Copy failed", err);
        addToast("Failed to copy to clipboard", "error");
      });
  };

  return (
    <Button onClick={handleCopy} className={className}>
      <>
        <div className="flex flex-row content-center justify-center align-middle">
          {toShow} {isCopied ? <ClipboardDocumentCheckIcon className="w-5 h-5"/> : <ClipboardDocumentIcon className="w-5 h-5" />}
        </div>
      </>
    </Button>
  );
};

export default ClipboardButton;
