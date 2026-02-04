import { Sparkle } from "lucide-react";
import { useEffect, useState } from "react";
import { Compose } from "~/renderer/components/blocks/compose";
import { ComposerResult } from "~/renderer/components/blocks/composer-result";
import { ComposerToolCalling } from "~/renderer/components/blocks/composer-tool-calling";
import { Greetings } from "~/renderer/components/blocks/greetings";
import { Kbd, KbdGroup } from "~/renderer/components/ui/kbd";

const Composer = () => {
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

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Don't trigger if user is typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      // "R" key to reply (only when result is shown and not loading)
      if (e.key === "r" && !e.metaKey && !e.ctrlKey && !e.altKey && result && !isLoading) {
        e.preventDefault();
        setIsReplying(true);
        setComposeOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [result, isLoading]);

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
        <div className="flex flex-col items-center justify-center h-screen p-8">
          <div className="max-w-2xl w-full">
            <ComposerResult result={result} />
          </div>
        </div>
      )}

      {steps.length === 0 && !result && !isLoading && (
        <div className="h-full flex flex-col items-center justify-center">
          <Greetings />
        </div>
      )}

      {/* Keyboard shortcuts */}
      {(steps.length === 0 || result) && !isLoading && (
        <div className="flex flex-col gap-2 text-xs absolute bottom-10 left-1/2 -translate-x-1/2">
          {result && (
            <KbdGroup>
              <span className="text-muted-foreground">Reply</span>
              <Kbd>R</Kbd>
            </KbdGroup>
          )}
          <KbdGroup>
            <span className="text-muted-foreground">{result ? "Compose new" : "Compose"}</span>
            <Kbd>N</Kbd>
          </KbdGroup>
          <KbdGroup>
            <span className="text-muted-foreground">Setting</span>
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
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
