import { SettingsRemoteServers } from "~/renderer/components/blocks/settings-servers-remote-2";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/renderer/components/ui/tabs";

export const SettingsServers = () => {
  return (
    <Tabs defaultValue="remote" className="h-full">
      <TabsList className="w-full rounded-b-none">
        <TabsTrigger value="remote">Remote Servers</TabsTrigger>
        <TabsTrigger value="local" disabled>
          Local Servers
        </TabsTrigger>
      </TabsList>
      <TabsContent value="remote" className="-mt-2 h-full">
        <SettingsRemoteServers />
      </TabsContent>
    </Tabs>
  );
};
