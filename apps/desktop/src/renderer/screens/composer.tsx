import { FlaskConical, Sparkle } from "lucide-react";
import { useEffect, useState } from "react";
import { Compose } from "~/renderer/components/blocks/compose";
import { ComposerResult } from "~/renderer/components/blocks/composer-result";
import { ComposerToolCalling } from "~/renderer/components/blocks/composer-tool-calling";
import { Greetings } from "~/renderer/components/blocks/greetings";
import { Badge } from "~/renderer/components/ui/badge";

interface ComposerProps {
  showSettings: boolean;
}

const Composer = ({ showSettings }: ComposerProps) => {
  const [steps, setSteps] = useState<any[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [isReplying, setIsReplying] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);

  useEffect(() => {
    const stepHandler = (step: any) => {
      setSteps((prev) => [...prev, step]);
    };

    const completeHandler = (result: any) => {
      const resultText = result._output || result.text || result;
      setResult(resultText);
      setIsLoading(false);

      // Store conversation: append assistant message
      setConversationHistory((prev) => [...prev, { role: "assistant", content: resultText }]);
    };

    const errorHandler = (error: any) => {
      console.error("AI Error:", error);
      setIsLoading(false);
    };

    window.electronAPI.onAIStep(stepHandler);
    window.electronAPI.onAIComplete(completeHandler);
    window.electronAPI.onAIError(errorHandler);
  }, []);

  // Composer shortcuts (N, R, Escape on result)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      const isInDialog = target.closest('[role="dialog"]');

      // Escape: Clear result (only when NOT in settings, NOT in dialog, and result is visible)
      if (e.key === "Escape" && !showSettings && !isInDialog && result && !isLoading) {
        e.preventDefault();
        setResult(null);
        setConversationHistory([]);
        setSteps([]);
        setIsReplying(false);
      }

      // N: New compose (skip if typing, not in settings)
      if (e.key === "n" && !isInInput && !e.metaKey && !e.ctrlKey && !e.altKey && !showSettings) {
        e.preventDefault();
        setComposeOpen(true);
      }

      // R: Reply (skip if typing, only when result exists, not in settings)
      if (e.key === "r" && !isInInput && !e.metaKey && !e.ctrlKey && !e.altKey && result && !isLoading && !showSettings) {
        e.preventDefault();
        setIsReplying(true);
        setComposeOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSettings, composeOpen, result, isLoading]);

  const handleAIResponse = async (prompt: string, mentions?: string[]) => {
    setSteps([]);
    setResult(null);
    setIsLoading(true);

    if (isReplying && conversationHistory.length > 0) {
      // Append new user message to conversation history
      const messages = [...conversationHistory, { role: "user", content: prompt }];

      // Update conversation history with the new user message
      setConversationHistory(messages);

      // Send with messages array
      window.electronAPI.aiCompose(null, mentions, messages);
      setIsReplying(false);
    } else {
      // Fresh conversation: store initial user message
      const initialMessage = { role: "user", content: prompt };
      setConversationHistory([initialMessage]);

      // Send with prompt
      window.electronAPI.aiCompose(prompt, mentions);
    }
  };

  return (
    <>
      {isLoading && steps.length === 0 && (
        <div className="flex flex-col items-center justify-center h-screen">
          <Sparkle className="w-8 h-8 animate-pulse" />
        </div>
      )}

      {steps.length > 0 && !result && <ComposerToolCalling steps={steps} />}

      {result && (
        <div className="mt-14 h-[calc(100vh-3.5rem)]">
          <ComposerResult result={result} />
        </div>
      )}

      {steps.length === 0 && !result && !isLoading && (
        <div className="h-full flex flex-col items-center justify-center">
          <div className="absolute right-3 bottom-3">
            <Badge variant="secondary">
              <FlaskConical data-icon="inline-start" className="" />
              Beta
            </Badge>
          </div>

          <Greetings />
        </div>
      )}

      <Compose
        onSubmit={handleAIResponse}
        externalOpen={composeOpen}
        onOpenChange={(open) => {
          setComposeOpen(open);
          if (!open) {
            setIsReplying(false);
          }
        }}
        replyingTo={isReplying && result ? result : undefined}
      />
    </>
  );
};

export default Composer;
