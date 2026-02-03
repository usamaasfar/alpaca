import { Layers, Server, Settings2, Zap } from "lucide-react";

import { SettingsGeneral } from "~/renderer/components/blocks/settings-general";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/renderer/components/ui/tabs";

const SettingsScreen = () => {
  return (
    <Tabs defaultValue="general" className="w-full h-full pt-8 pb-2.5 px-2.5">
      <TabsList className="w-full">
        <TabsTrigger value="general">
          <Settings2 />
          General
        </TabsTrigger>
        <TabsTrigger value="providers">
          <Layers />
          Providers
        </TabsTrigger>
        <TabsTrigger value="servers">
          <Server />
          Servers
        </TabsTrigger>
        <TabsTrigger value="presets" disabled>
          <Zap />
          Presets
        </TabsTrigger>
      </TabsList>
      <TabsContent value="general" className="h-full">
        <SettingsGeneral />
      </TabsContent>
      <TabsContent value="providers" className="h-full">
        <p>providers</p>
      </TabsContent>
      <TabsContent value="servers" className="h-full">
        <p>servers</p>
      </TabsContent>
    </Tabs>
  );
};

export default SettingsScreen;
