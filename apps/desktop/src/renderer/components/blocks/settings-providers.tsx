import { zodResolver } from "@hookform/resolvers/zod";
import { Loader } from "lucide-react";
import { memo } from "react";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "~/renderer/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "~/renderer/components/ui/card";
import { Field, FieldError } from "~/renderer/components/ui/field";
import { Input } from "~/renderer/components/ui/input";
import { Label } from "~/renderer/components/ui/label";
import { ScrollArea } from "~/renderer/components/ui/scroll-area";
import { useProvidersSettingsStore } from "~/renderer/stores/providers";

const providerSchema = z.object({
  baseUrl: z.string().min(1, "Base URL is required"),
  apiKey: z.string().min(1, "API key is required"),
  model: z.string().min(1, "Model name is required"),
});

type ProviderForm = z.infer<typeof providerSchema>;

export const SettingsProviders = memo(() => {
  const { isLoading, config, setProvider } = useProvidersSettingsStore();

  const form = useForm<ProviderForm>({
    resolver: zodResolver(providerSchema),
    defaultValues: { baseUrl: config?.baseUrl || "", apiKey: config?.apiKey || "", model: config?.model || "" },
  });

  const onSubmit = async (data: ProviderForm) => {
    await setProvider({ baseUrl: data.baseUrl, apiKey: data.apiKey, model: data.model });
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
        <CardDescription>Configure your OpenAI-compatible AI provider and model settings</CardDescription>
      </CardHeader>
      <ScrollArea className="flex-1 h-0">
        <CardContent className="pb-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

            <Controller
              name="model"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <Label htmlFor={field.name}>Model Name</Label>
                  <Input {...field} id={field.name} placeholder="e.g., kimi-k2.5:cloud" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Button type="submit" className="w-full" disabled={!form.formState.isDirty || form.formState.isSubmitting}>
              Save
            </Button>
          </form>
        </CardContent>
      </ScrollArea>
    </Card>
  );
});
