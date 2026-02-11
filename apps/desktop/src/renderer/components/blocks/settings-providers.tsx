import { zodResolver } from "@hookform/resolvers/zod";
import { Loader } from "lucide-react";
import { memo, useEffect, type SyntheticEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";

import { PROVIDERS, type ProviderType } from "~/common/providers";
import { Button } from "~/renderer/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "~/renderer/components/ui/card";
import { Field, FieldError } from "~/renderer/components/ui/field";
import { Input } from "~/renderer/components/ui/input";
import { Label } from "~/renderer/components/ui/label";
import { ScrollArea } from "~/renderer/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/renderer/components/ui/select";
import {
  type AnthropicProvider,
  type GoogleProvider,
  type OllamaProvider,
  type OpenAICompatibleProvider,
  type OpenAIProvider,
  useProvidersSettingsStore,
} from "~/renderer/stores/providers";

const PROVIDER_TYPES = ["ollama", "openaiCompatible", "openai", "anthropic", "google"] as const;

const PROVIDER_LOOKUP = Object.fromEntries(PROVIDERS.map((provider) => [provider.type, provider])) as Record<
  ProviderType,
  (typeof PROVIDERS)[number]
>;

const API_KEY_PROVIDERS = new Set<ProviderType>(["openai", "anthropic", "google", "openaiCompatible"]);

type ProviderForm = {
  selectedProvider: ProviderType;
  modelName: string;
  apiKey?: string;
  baseUrl?: string;
};

const providerSchema = z
  .object({
    selectedProvider: z.enum(PROVIDER_TYPES),
    modelName: z.string().min(1, "Model name is required"),
    apiKey: z.string().optional(),
    baseUrl: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (API_KEY_PROVIDERS.has(data.selectedProvider) && !data.apiKey) {
      ctx.addIssue({
        code: "custom",
        message: "API Key is required",
        path: ["apiKey"],
      });
    }

    if (data.selectedProvider === "openaiCompatible" && !data.baseUrl) {
      ctx.addIssue({
        code: "custom",
        message: "Base URL is required",
        path: ["baseUrl"],
      });
    }
  });

const getApiKeyPlaceholder = (provider: ProviderType) => {
  switch (provider) {
    case "openai":
      return "sk-...";
    case "anthropic":
      return "sk-ant-...";
    case "google":
      return "AIza...";
    default:
      return "Enter your API key";
  }
};

const hideBrokenImage = (event: SyntheticEvent<HTMLImageElement>) => {
  event.currentTarget.style.display = "none";
};

type PersistedProvider =
  | OllamaProvider
  | OpenAICompatibleProvider
  | OpenAIProvider
  | AnthropicProvider
  | GoogleProvider
  | undefined;

const getProviderFormValues = (selectedProvider: ProviderType, providerConfig: PersistedProvider): ProviderForm => {
  if (!providerConfig) {
    return {
      selectedProvider,
      modelName: "",
      apiKey: "",
      baseUrl: "",
    };
  }

  if (providerConfig.provider === "ollama") {
    return {
      selectedProvider,
      modelName: providerConfig.model,
      apiKey: "",
      baseUrl: "",
    };
  }

  if (providerConfig.provider === "openaiCompatible") {
    return {
      selectedProvider,
      modelName: providerConfig.model,
      apiKey: providerConfig.apiKey,
      baseUrl: providerConfig.baseUrl,
    };
  }

  return {
    selectedProvider,
    modelName: providerConfig.model,
    apiKey: "apiKey" in providerConfig ? providerConfig.apiKey : "",
    baseUrl: "",
  };
};

const ProviderOption = ({ providerType }: { providerType: ProviderType }) => {
  const provider = PROVIDER_LOOKUP[providerType];

  return (
    <div className="flex items-center space-x-2">
      <img src={provider.logo} alt={provider.displayName} className="w-4 h-4 object-contain invert" onError={hideBrokenImage} />
      <span>{provider.displayName}</span>
    </div>
  );
};

export const SettingsProviders = memo(() => {
  const {
    selectedProvider,
    providers,
    isOllamaConnected,
    ollamaModels,
    isLoading,
    getOllamaHealth,
    getOllamaModels,
    getProviders,
    setProvider,
    setSelectedProvider,
  } = useProvidersSettingsStore();

  const form = useForm<ProviderForm>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      selectedProvider,
      modelName: "",
      apiKey: "",
      baseUrl: "",
    },
  });

  const formSelectedProvider = form.watch("selectedProvider");

  useEffect(() => {
    getProviders();
  }, [getProviders]);

  useEffect(() => {
    getOllamaHealth();
  }, [getOllamaHealth]);

  useEffect(() => {
    if (formSelectedProvider === "ollama" && isOllamaConnected) {
      getOllamaModels();
    }
  }, [formSelectedProvider, isOllamaConnected, getOllamaModels]);

  useEffect(() => {
    form.setValue("selectedProvider", selectedProvider);
  }, [selectedProvider, form]);

  useEffect(() => {
    const providerConfig = providers[formSelectedProvider];
    form.reset(getProviderFormValues(formSelectedProvider, providerConfig));
  }, [formSelectedProvider, providers, form]);

  const onSubmit = async (data: ProviderForm) => {
    if (data.selectedProvider === "ollama") {
      await setProvider({
        provider: data.selectedProvider,
        model: data.modelName,
      });
    } else if (data.selectedProvider === "openaiCompatible") {
      await setProvider({
        provider: data.selectedProvider,
        model: data.modelName,
        apiKey: data.apiKey || "",
        baseUrl: data.baseUrl || "",
      });
    } else {
      await setProvider({
        provider: data.selectedProvider,
        model: data.modelName,
        apiKey: data.apiKey || "",
      });
    }

    await setSelectedProvider(data.selectedProvider);
    form.reset(data);
  };

  const hasProviderChanges = formSelectedProvider !== selectedProvider;
  const shouldEnableButton = hasProviderChanges || form.formState.isDirty;

  const renderModelInput = (placeholder = "e.g., gpt-4o-mini") => (
    <Controller
      name="modelName"
      control={form.control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <Label htmlFor={field.name}>Model Name</Label>
          <Input {...field} id={field.name} placeholder={placeholder} aria-invalid={fieldState.invalid} />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );

  const renderApiKeyInput = () => (
    <Controller
      name="apiKey"
      control={form.control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <Label htmlFor={field.name}>API Key</Label>
          <Input {...field} id={field.name} type="password" placeholder={getApiKeyPlaceholder(formSelectedProvider)} aria-invalid={fieldState.invalid} />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );

  const renderProviderFields = () => {
    switch (formSelectedProvider) {
      case "ollama":
        return (
          <Controller
            name="modelName"
            control={form.control}
            render={({ field, fieldState }) => {
              const ollamaError = !isOllamaConnected
                ? {
                    message: "Can't connect to Ollama. Install from https://ollama.com or start Ollama if already installed.",
                  }
                : ollamaModels.length === 0
                  ? { message: "No models found. Run: ollama pull llama3.2" }
                  : null;

              const hasError = fieldState.invalid || ollamaError;

              return (
                <Field data-invalid={hasError}>
                  <Label htmlFor={field.name}>Model Name</Label>
                  <Select value={field.value} onValueChange={field.onChange} disabled={!isOllamaConnected || ollamaModels.length === 0}>
                    <SelectTrigger aria-invalid={!!hasError}>
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {ollamaModels.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  {ollamaError && <FieldError errors={[ollamaError]} />}
                </Field>
              );
            }}
          />
        );

      case "openaiCompatible":
        return (
          <>
            {renderModelInput("e.g., llama-3.1-70b")}
            <Controller
              name="baseUrl"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <Label htmlFor={field.name}>Base URL</Label>
                  <Input {...field} id={field.name} placeholder="https://api.example.com/v1" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            {renderApiKeyInput()}
          </>
        );

      case "openai":
      case "anthropic":
      case "google":
        return (
          <>
            {renderModelInput()}
            {renderApiKeyInput()}
          </>
        );

      default:
        return null;
    }
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
              name="selectedProvider"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <Label htmlFor={field.name}>{field.value === selectedProvider ? "Selected" : "Select"} Provider</Label>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a provider">{field.value && <ProviderOption providerType={field.value} />}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((provider) => (
                        <SelectItem key={provider.type} value={provider.type}>
                          <ProviderOption providerType={provider.type} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            {renderProviderFields()}

            <Button type="submit" className="w-full" disabled={!shouldEnableButton || form.formState.isSubmitting}>
              Select
            </Button>
          </form>
        </CardContent>
      </ScrollArea>
    </Card>
  );
});
