import { DashboardHeader } from '@/components/dashboard/dashboard-shell';
import { CollaboratorsSettings } from '@/components/dashboard/collaborators-settings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { useBusinessContext } from '@/app/(app)/dashboard/[businessId]/_layout';
import { useUpdateBusiness } from '@/lib/queries/onboarding';
import {
  businessSettingsSchema,
  type BusinessSettingsValues,
} from '@/lib/validation/onboarding-schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect } from 'expo-router';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

const BUSINESS_TYPE_OPTIONS = [
  { value: 'STORE', label: 'Tienda' },
  { value: 'RESTAURANT', label: 'Restaurante' },
  { value: 'OTHER', label: 'Otro' },
] as const;

export default function BusinessSettingsScreen() {
  const business = useBusinessContext();
  const updateBusinessMutation = useUpdateBusiness();
  const [message, setMessage] = React.useState('');

  const form = useForm<BusinessSettingsValues>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: {
      name: business.name,
      businessType: (business.businessType as BusinessSettingsValues['businessType']) || 'OTHER',
      currencyCode: business.currencyCode || 'COP',
      timezone: business.timezone || 'America/Bogota',
    },
  });

  React.useEffect(() => {
    form.reset({
      name: business.name,
      businessType: (business.businessType as BusinessSettingsValues['businessType']) || 'OTHER',
      currencyCode: business.currencyCode || 'COP',
      timezone: business.timezone || 'America/Bogota',
    });
  }, [business, form]);

  if (business.role !== 'OWNER' && business.role !== 'MANAGER') {
    return <Redirect href={`/dashboard/${business.id}`} />;
  }

  async function submit(values: BusinessSettingsValues) {
    setMessage('');
    try {
      await updateBusinessMutation.mutateAsync({ id: business.id, input: values });
      setMessage('Cambios guardados');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'No pudimos guardar los cambios.');
    }
  }

  return (
    <View className="flex-1">
      <DashboardHeader
        eyebrow="Configuración"
        title="Configura tu negocio"
        subtitle="Estos datos ayudan a que Oikentra se adapte a tu forma de trabajar."
      />
      <Card>
        <CardHeader>
          <CardTitle>Información general</CardTitle>
          <CardDescription>Actualiza los datos básicos del espacio actual.</CardDescription>
        </CardHeader>
        <CardContent className="gap-5">
          <View className="gap-2">
            <Label>Nombre del negocio</Label>
            <Controller
              control={form.control}
              name="name"
              render={({ field: { onBlur, onChange, value } }) => (
                <Input value={value} onChangeText={onChange} onBlur={onBlur} />
              )}
            />
            {form.formState.errors.name ? (
              <Text className="text-destructive text-sm">{form.formState.errors.name.message}</Text>
            ) : null}
          </View>

          <View className="gap-2">
            <Label>Tipo de negocio</Label>
            <Controller
              control={form.control}
              name="businessType"
              render={({ field: { onChange, value } }) => (
                <Select
                  value={{
                    value,
                    label:
                      BUSINESS_TYPE_OPTIONS.find((option) => option.value === value)?.label ??
                      value,
                  }}
                  onValueChange={(option) => onChange(option?.value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} label={option.label} />
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.businessType ? (
              <Text className="text-destructive text-sm">
                {form.formState.errors.businessType.message}
              </Text>
            ) : null}
          </View>

          <View className="flex-col gap-5 sm:flex-row">
            <View className="flex-1 gap-2">
              <Label>Moneda</Label>
              <Controller
                control={form.control}
                name="currencyCode"
                render={({ field: { onBlur, onChange, value } }) => (
                  <Input
                    value={value}
                    maxLength={3}
                    onChangeText={(text) => onChange(text.toUpperCase())}
                    onBlur={onBlur}
                  />
                )}
              />
              {form.formState.errors.currencyCode ? (
                <Text className="text-destructive text-sm">
                  {form.formState.errors.currencyCode.message}
                </Text>
              ) : null}
            </View>
            <View className="flex-1 gap-2">
              <Label>Zona horaria</Label>
              <Controller
                control={form.control}
                name="timezone"
                render={({ field: { onBlur, onChange, value } }) => (
                  <Input value={value} onChangeText={onChange} onBlur={onBlur} />
                )}
              />
              {form.formState.errors.timezone ? (
                <Text className="text-destructive text-sm">
                  {form.formState.errors.timezone.message}
                </Text>
              ) : null}
            </View>
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
      {business.role === 'OWNER' ? <CollaboratorsSettings businessId={business.id} /> : null}
    </View>
  );
}
