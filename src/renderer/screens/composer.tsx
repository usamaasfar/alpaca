import type { StepResult } from "ai";
import { useEffect } from "react";
import { Compose } from "@/renderer/components/blocks/compose";
import { Settings } from "@/renderer/components/blocks/settings";
import { Kbd, KbdGroup } from "@/renderer/components/ui/kbd";

const Welcome = () => {
  useEffect(() => {
    const stepHandler = (step) => {
      console.log(`Step ${step.text}:`, step);
    };

    const completeHandler = (result) => {
      console.log("AI Complete:", result);
    };

    const errorHandler = (error) => {
      console.error("AI Error:", error);
    };

    window.electronAPI.onAIStep(stepHandler);
    window.electronAPI.onAIComplete(completeHandler);
    window.electronAPI.onAIError(errorHandler);

    // Cleanup function would go here if the preload exposed removeListener methods
  }, []);

  const handleAIResponse = async (prompt: string) => {
    console.log("Sending prompt:", prompt);
    window.electronAPI.aiCompose(prompt);
  };

  return (
    <>
      <div className="h-full flex flex-col items-center justify-center">
        <p className="text-3xl font-extralight">Good morning, Alex</p>
        <div className="flex flex-col gap-2 text-xs absolute bottom-10">
          <KbdGroup>
            <span className="text-muted-foreground">Compose</span>
            <Kbd>⌘</Kbd>
            <Kbd>N</Kbd>
          </KbdGroup>
          <KbdGroup>
            <span className="text-muted-foreground">Setting</span>
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
        </div>
      </div>
      <Settings />
      <Compose onSubmit={handleAIResponse} />
    </>
  );
};

export default Welcome;
