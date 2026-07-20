import { DashboardHeader } from '@/components/dashboard/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useBusinessContext } from '@/app/(app)/dashboard/[businessId]/_layout';
import { usePatchProfile, useProfile, useSaveProfile } from '@/lib/queries/onboarding';
import {
  profileSettingsSchema,
  type ProfileSettingsValues,
} from '@/lib/validation/onboarding-schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { colombiaDepartments, type LocationOption } from '@oikentra/location-catalog';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';

export default function ProfileSettingsScreen() {
  const business = useBusinessContext();
  const { data: profile, isPending: profileLoading } = useProfile();
  const saveProfileMutation = useSaveProfile();
  const patchProfileMutation = usePatchProfile();
  const [message, setMessage] = React.useState('');

  const form = useForm<ProfileSettingsValues>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: {
      department: '',
      city: '',
      phone: '',
    },
  });

  React.useEffect(() => {
    if (profile) {
      form.reset({
        department: profile.department ?? '',
        city: profile.city ?? '',
        phone: profile.phone ?? '',
      });
    }
  }, [profile, form]);

  async function submit(values: ProfileSettingsValues) {
    setMessage('');
    try {
      const hasExistingProfile = Boolean(profile && 'userId' in profile);
      const payload = {
        department: values.department,
        city: values.city,
        phone: values.phone || null,
      };
      const updated = hasExistingProfile
        ? await patchProfileMutation.mutateAsync(payload)
        : await saveProfileMutation.mutateAsync(payload);
      form.reset({
        department: updated.department ?? '',
        city: updated.city ?? '',
        phone: updated.phone ?? '',
      });
      setMessage('Cambios guardados');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'No pudimos guardar los cambios.');
    }
  }

  if (profileLoading && !profile) {
    return (
      <View className="flex-1">
        <DashboardHeader title="Configura tu perfil" />
        <Text variant="muted">Cargando tu perfil...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <DashboardHeader
        eyebrow="Perfil"
        title="Configura tu perfil"
        subtitle="Mantén tus datos de contacto actualizados."
      />
      <Card>
        <CardHeader>
          <CardTitle>Información personal</CardTitle>
          <CardDescription>Edita tu ubicación y teléfono de contacto.</CardDescription>
        </CardHeader>
        <CardContent className="gap-5">
          <FormLocationSelect
            form={form}
            name="department"
            label="Departamento"
            options={colombiaDepartments}
            placeholder="Busca tu departamento"
            onChange={(value) => {
              form.setValue('department', value);
              form.setValue('city', '');
            }}
          />
          <FormLocationSelect
            form={form}
            name="city"
            label="Ciudad o municipio"
            options={
              colombiaDepartments.find(({ name }) => name === form.watch('department'))
                ?.municipalities ?? []
            }
            placeholder="Busca tu ciudad o municipio"
            disabled={!form.watch('department')}
          />
          <View className="gap-2">
            <Label>Teléfono</Label>
            <Controller
              control={form.control}
              name="phone"
              render={({ field: { onBlur, onChange, value } }) => (
                <Input
                  inputMode="tel"
                  placeholder="300 000 0000"
                  value={value ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                />
              )}
            />
            {form.formState.errors.phone ? (
              <Text className="text-destructive text-sm">
                {form.formState.errors.phone.message}
              </Text>
            ) : null}
          </View>

          {message ? (
            <Text
              className={message === 'Cambios guardados' ? 'text-primary' : 'text-destructive'}
              accessibilityLiveRegion="polite">
              {message}
            </Text>
          ) : null}

          <Button onPress={form.handleSubmit(submit)} disabled={form.formState.isSubmitting}>
            <Text>{form.formState.isSubmitting ? 'Guardando...' : 'Guardar cambios'}</Text>
          </Button>
        </CardContent>
      </Card>
    </View>
  );
}

function FormLocationSelect({
  form,
  name,
  label,
  options,
  placeholder,
  disabled,
  onChange,
}: {
  form: ReturnType<typeof useForm<ProfileSettingsValues>>;
  name: 'department' | 'city';
  label: string;
  options: LocationOption[];
  placeholder: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field: { onBlur, onChange: fieldOnChange, value } }) => (
        <View className="gap-2">
          <Label>{label}</Label>
          <LocationSelect
            value={value ?? ''}
            options={options}
            placeholder={placeholder}
            disabled={disabled}
            onChange={(next) => {
              fieldOnChange(next);
              onChange?.(next);
            }}
            onBlur={onBlur}
          />
          {form.formState.errors[name] ? (
            <Text className="text-destructive text-sm">{form.formState.errors[name]?.message}</Text>
          ) : null}
        </View>
      )}
    />
  );
}

function LocationSelect({
  value,
  options,
  placeholder,
  disabled,
  onChange,
  onBlur,
}: {
  value: string;
  options: LocationOption[];
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const [query, setQuery] = React.useState(value);
  const [open, setOpen] = React.useState(false);
  const filtered = options
    .filter(({ name }) => name.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
    .slice(0, 80);

  React.useEffect(() => {
    setQuery(value);
  }, [value]);

  return (
    <View>
      <Input
        accessibilityRole="combobox"
        accessibilityState={{ disabled, expanded: open }}
        className="h-14 rounded-xl px-4"
        placeholder={placeholder}
        value={query}
        editable={!disabled}
        onFocus={() => setOpen(true)}
        onChangeText={(text) => {
          setQuery(text);
          setOpen(true);
          onChange('');
        }}
        onBlur={() => {
          onBlur();
          setTimeout(() => setOpen(false), 150);
        }}
      />
      {open && !disabled ? (
        <View className="border-border bg-popover mt-1 max-h-56 rounded-xl border p-1">
          {filtered.length ? (
            filtered.map((option) => (
              <Pressable
                key={option.code}
                className="active:bg-accent rounded-lg px-3 py-3"
                onPress={() => {
                  onChange(option.name);
                  setQuery(option.name);
                  setOpen(false);
                }}
                accessibilityRole="button">
                <Text>{option.name}</Text>
              </Pressable>
            ))
          ) : (
            <Text className="text-muted-foreground p-3">No encontramos coincidencias.</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}
