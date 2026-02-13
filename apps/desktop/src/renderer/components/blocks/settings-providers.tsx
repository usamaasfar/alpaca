import { Loader } from "lucide-react";
import { memo, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "~/renderer/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "~/renderer/components/ui/card";
import { Field, FieldError } from "~/renderer/components/ui/field";
import { Input } from "~/renderer/components/ui/input";
import { Label } from "~/renderer/components/ui/label";
import { ScrollArea } from "~/renderer/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/renderer/components/ui/select";
import { type ProviderConfig, type ProviderType, useProvidersSettingsStore } from "~/renderer/stores/providers";

interface ProviderForm {
  provider: ProviderType;
  model: string;
  baseUrl?: string;
  apiKey?: string;
}

const providers: Record<ProviderType, { name: string; logo: string }> = {
  openai: {
    name: "OpenAI",
    logo: "https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/light/openai.png",
  },
  anthropic: {
    name: "Anthropic",
    logo: "https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/light/claude-color.png",
  },
  google: {
    name: "Google",
    logo: "https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/light/gemini-color.png",
  },
  ollama: {
    name: "Ollama",
    logo: "https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/light/ollama.png",
  },
  "openai-compatible": {
    name: "OpenAI Compatible",
    logo: "https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/light/openai.png",
  },
};

export const SettingsProviders = memo(() => {
  const { isLoading, selectedProvider, providerConfig, getProvider, setProvider } = useProvidersSettingsStore();

  const form = useForm<ProviderForm>({
    defaultValues: {
      provider: selectedProvider || "openai-compatible",
      model: providerConfig?.model || "",
      baseUrl: "baseUrl" in (providerConfig || {}) ? (providerConfig as any).baseUrl : "",
      apiKey: "apiKey" in (providerConfig || {}) ? (providerConfig as any).apiKey : "",
    },
  });

  const watchedProvider = form.watch("provider");

  // Load config when provider changes
  useEffect(() => {
    const loadProviderConfig = async () => {
      const config = await getProvider(watchedProvider);
      form.reset({ provider: watchedProvider, ...config });
    };

    loadProviderConfig();
  }, [watchedProvider, getProvider]);

  const onSubmit = async (data: ProviderForm) => {
    // Manual validation based on provider
    if (!data.model?.trim()) {
      form.setError("model", { message: "Model name is required" });
      return;
    }

    if (data.provider !== "ollama" && !data.apiKey?.trim()) {
      form.setError("apiKey", { message: "API key is required" });
      return;
    }

    if (data.provider === "openai-compatible" && !data.baseUrl?.trim()) {
      form.setError("baseUrl", { message: "Base URL is required" });
      return;
    }

    // Build config based on provider type
    let config: ProviderConfig;

    if (data.provider === "ollama") {
      config = { model: data.model };
    } else if (data.provider === "openai-compatible") {
      config = { model: data.model, baseUrl: data.baseUrl!, apiKey: data.apiKey! };
    } else {
      // openai, anthropic, google
      config = { model: data.model, apiKey: data.apiKey! };
    }

    await setProvider(data.provider, config);
    form.reset(data);
  };

  return (
    <Card className="relative h-full flex flex-col">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50 rounded-xl">
          <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <CardHeader className="shrink-0">
        <CardDescription>Configure your AI provider and model settings</CardDescription>
      </CardHeader>
      <ScrollArea className="flex-1 h-0">
        <CardContent className="pb-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Controller
              name="provider"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <Label htmlFor={field.name}>Provider</Label>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a provider">
                        {field.value && (
                          <div className="flex items-center gap-2">
                            <img src={providers[field.value].logo} alt={providers[field.value].name} className="w-4 h-4" />
                            <span>{providers[field.value].name}</span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(providers).map(([key, provider]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <img src={provider.logo} alt={provider.name} className="w-4 h-4" />
                            <span>{provider.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="model"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <Label htmlFor={field.name}>Model Name</Label>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="e.g., gpt-4, claude-3-5-sonnet-20241022, phi3"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {watchedProvider === "openai-compatible" && (
              <Controller
                name="baseUrl"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <Label htmlFor={field.name}>Base URL</Label>
                    <Input {...field} id={field.name} placeholder="http://localhost:11434/v1/" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            )}

            {watchedProvider !== "ollama" && (
              <Controller
                name="apiKey"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <Label htmlFor={field.name}>API Key</Label>
                    <Input {...field} id={field.name} type="password" placeholder="Enter API key" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={(watchedProvider === selectedProvider && !form.formState.isDirty) || form.formState.isSubmitting}
            >
              Save
            </Button>
          </form>
        </CardContent>
      </ScrollArea>
    </Card>
  );
});
