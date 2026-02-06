import { Layers, Server, Settings2, Zap } from "lucide-react";

import { SettingsGeneral } from "~/renderer/components/blocks/settings-general";
import { SettingsProviders } from "~/renderer/components/blocks/settings-providers";
import { SettingsServers } from "~/renderer/components/blocks/settings-servers";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/renderer/components/ui/tabs";

const SettingsScreen = () => {
  return (
    <Tabs defaultValue="general" className="w-full h-full overflow-hidden pt-8 pb-2.5 px-2.5">
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
      <TabsContent value="general" className="min-h-0">
        <SettingsGeneral />
      </TabsContent>
      <TabsContent value="providers" className="min-h-0">
        <SettingsProviders />
      </TabsContent>
      <TabsContent value="servers" className="min-h-0">
        <SettingsServers />
      </TabsContent>
    </Tabs>
  );
};

export default SettingsScreen;
