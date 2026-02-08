import { zodResolver } from "@hookform/resolvers/zod";
import { Loader } from "lucide-react";
import { memo, useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";

import { PROVIDERS } from "~/common/providers";
import { Button } from "~/renderer/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "~/renderer/components/ui/card";
import { Field, FieldError } from "~/renderer/components/ui/field";
import { Input } from "~/renderer/components/ui/input";
import { Label } from "~/renderer/components/ui/label";
import { ScrollArea } from "~/renderer/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/renderer/components/ui/select";
import { useProvidersSettingsStore } from "~/renderer/stores/providers";

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

  const providerSchema = useMemo(() => {
    return z
      .object({
        selectedProvider: z.enum(["ollama", "openaiCompatible"]),
        modelName: z.string().min(1, "Model name is required"),
        apiKey: z.string().optional(),
        baseUrl: z.string().optional(),
      })
      .superRefine((data, ctx) => {
        if (data.selectedProvider === "openaiCompatible") {
          if (!data.apiKey) {
            ctx.addIssue({
              code: "custom",
              message: "API Key is required",
              path: ["apiKey"],
            });
          }
          if (!data.baseUrl) {
            ctx.addIssue({
              code: "custom",
              message: "Base URL is required",
              path: ["baseUrl"],
            });
          }
        }
      });
  }, []);

  const form = useForm<z.infer<typeof providerSchema>>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      selectedProvider: selectedProvider,
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
    if (formSelectedProvider === "ollama" && isOllamaConnected)
      getOllamaModels();
  }, [formSelectedProvider, isOllamaConnected, getOllamaModels]);

  useEffect(() => {
    if (selectedProvider) form.setValue("selectedProvider", selectedProvider);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvider]);

  useEffect(() => {
    const providerConfig = providers[formSelectedProvider];
    const isOpenAICompatible = providerConfig?.provider === "openaiCompatible";
    const formData = {
      selectedProvider: formSelectedProvider,
      modelName: providerConfig?.model || "",
      apiKey: isOpenAICompatible ? providerConfig.apiKey : "",
      baseUrl: isOpenAICompatible ? providerConfig.baseUrl : "",
    };
    form.reset(formData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formSelectedProvider, providers]);

  const onSubmit = async (data: z.infer<typeof providerSchema>) => {
    if (data.selectedProvider === "openaiCompatible") {
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
      });
    }
    await setSelectedProvider(data.selectedProvider);
    form.reset(data);
  };

  // Check if current form differs from selected provider
  const hasProviderChanges = formSelectedProvider !== selectedProvider;
  const hasFormChanges = form.formState.isDirty;
  const shouldEnableButton = hasProviderChanges || hasFormChanges;

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
                    message:
                      "Can't connect to Ollama. Install from https://ollama.com or start Ollama if already installed.",
                  }
                : ollamaModels.length === 0
                  ? { message: "No models found. Run: ollama pull llama3.2" }
                  : null;

              const hasError = fieldState.invalid || ollamaError;

              return (
                <Field data-invalid={hasError}>
                  <Label htmlFor={field.name}>Model Name</Label>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!isOllamaConnected || ollamaModels.length === 0}
                  >
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
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                  {ollamaError && <FieldError errors={[ollamaError]} />}
                </Field>
              );
            }}
          />
        );

      case "openaiCompatible":
        return (
          <>
            <Controller
              name="modelName"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <Label htmlFor={field.name}>Model Name</Label>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="e.g., llama-3.1-70b"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="baseUrl"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <Label htmlFor={field.name}>Base URL</Label>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="https://api.example.com/v1"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="apiKey"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <Label htmlFor={field.name}>API Key</Label>
                  <Input
                    {...field}
                    id={field.name}
                    type="password"
                    placeholder="Enter your API key"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
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
        <CardDescription>
          Configure your AI provider and model settings
        </CardDescription>
      </CardHeader>
      <ScrollArea className="flex-1 h-0">
        <CardContent className="pb-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Controller
              name="selectedProvider"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <Label htmlFor={field.name}>
                    {field.value === selectedProvider ? "Selected" : "Select"}{" "}
                    Provider
                  </Label>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a provider">
                        {field.value && (
                          <div className="flex items-center space-x-2">
                            <img
                              src={
                                PROVIDERS.find((p) => p.type === field.value)
                                  ?.logo
                              }
                              alt={
                                PROVIDERS.find((p) => p.type === field.value)
                                  ?.displayName
                              }
                              className="w-4 h-4 object-contain invert"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                              }}
                            />
                            <span>
                              {
                                PROVIDERS.find((p) => p.type === field.value)
                                  ?.displayName
                              }
                            </span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((provider) => (
                        <SelectItem key={provider.type} value={provider.type}>
                          <div className="flex items-center space-x-2">
                            <img
                              src={provider.logo}
                              alt={provider.displayName}
                              className="w-4 h-4 object-contain invert"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                              }}
                            />
                            <span>{provider.displayName}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            {renderProviderFields()}

            <Button
              type="submit"
              className="w-full"
              disabled={!shouldEnableButton || form.formState.isSubmitting}
            >
              Select
            </Button>
          </form>
        </CardContent>
      </ScrollArea>
    </Card>
  );
});
