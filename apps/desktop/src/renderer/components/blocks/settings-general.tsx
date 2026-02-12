import { zodResolver } from "@hookform/resolvers/zod";
import { Loader } from "lucide-react";
import { memo, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "~/renderer/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "~/renderer/components/ui/card";
import { Field, FieldError } from "~/renderer/components/ui/field";
import { Input } from "~/renderer/components/ui/input";
import { Label } from "~/renderer/components/ui/label";
import { ScrollArea } from "~/renderer/components/ui/scroll-area";
import { Textarea } from "~/renderer/components/ui/textarea";
import { useGeneralSettingsStore } from "~/renderer/stores/general";

const formSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be at most 20 characters"),
  customInstructions: z.string().max(500, "Instructions must be at most 500 characters"),
});

export const SettingsGeneral = memo(() => {
  const { isLoading, username, customInstructions, setGeneralSetting, getGeneralSettings } = useGeneralSettingsStore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: "", customInstructions: "" },
  });

  useEffect(() => {
    getGeneralSettings();
  }, [getGeneralSettings]);

  useEffect(() => {
    form.reset({ username, customInstructions });
  }, [username, customInstructions, form]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    await setGeneralSetting(data);
  };

  return (
    <Card className="relative h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50 rounded-xl">
          <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <CardHeader>
        <CardDescription>Configure how the AI should interact with you</CardDescription>
      </CardHeader>
      <ScrollArea className="flex-1 h-0">
        <CardContent className="pb-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Controller
              name="username"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <Label htmlFor={field.name}>Username</Label>
                  <Input {...field} id={field.name} placeholder="How should the AI call you?" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="customInstructions"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <Label htmlFor={field.name}>Custom Instructions</Label>
                  <Textarea
                    {...field}
                    id={field.name}
                    placeholder="Add custom instructions for the AI..."
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Button type="submit" className="w-full" disabled={!form.formState.isDirty}>
              Save
            </Button>
          </form>
        </CardContent>
      </ScrollArea>
    </Card>
  );
});
