import { Kbd, KbdGroup } from "@/renderer/components/ui/kbd";
import { Settings } from "@/renderer/components/blocks/settings";
import { Compose } from "@/renderer/components/blocks/compose";

const Welcome = () => {
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
      <Compose />
    </>
  );
};

export default Welcome;
