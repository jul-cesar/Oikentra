import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { createBusiness, getBusinesses, getProfile, saveActiveBusinessId, saveProfile, type Business } from '@/lib/onboarding-api';
import { businessOnboardingSchema, profileOnboardingSchema, type BusinessOnboardingValues, type ProfileOnboardingValues } from '@/lib/validation/onboarding-schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { colombiaDepartments, type LocationOption } from '@oikentra/location-catalog';
import * as React from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, Pressable, View } from 'react-native';

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<'loading' | 'profile' | 'business' | 'ready' | 'error'>('loading');
  const [businesses, setBusinesses] = React.useState<Business[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setStatus('loading'); setError(null);
    try {
      const profile = await getProfile();
      if (!profile.profileCompleted) { setStatus('profile'); return; }
      const records = await getBusinesses();
      setBusinesses(records);
      setStatus('business');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos cargar tu onboarding.'); setStatus('error'); }
  }, []);

  React.useEffect(() => { void load(); }, [load]);
  if (status === 'loading') return <View className="flex-1 items-center justify-center gap-3"><ActivityIndicator /><Text variant="muted">Preparando tu espacio...</Text></View>;
  if (status === 'error') return <View className="flex-1 items-center justify-center gap-4 p-6"><Text className="text-center text-destructive" accessibilityRole="alert">{error}</Text><Button onPress={() => void load()}><Text>Reintentar</Text></Button></View>;
  if (status === 'profile') return <ProfileOnboarding onComplete={() => void load()} />;
  if (status === 'business') return <BusinessOnboarding businesses={businesses} onComplete={() => void load()} />;
  return <>{children}</>;
}

function ProfileOnboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<ProfileOnboardingValues>({ resolver: zodResolver(profileOnboardingSchema), defaultValues: { department: '', city: '', phone: '' }, mode: 'onTouched' });
  const fields = ['department', 'city', 'phone'] as const;
  const labels = ['Departamento', 'Ciudad', 'Teléfono'];
  const departmentValue = useWatch({ control: form.control, name: 'department' });
  const selectedDepartment = colombiaDepartments.find(({ name }) => name === departmentValue);

  async function next() {
    const valid = await form.trigger(fields[step]);
    if (!valid) return;
    if (step < fields.length - 1) { setStep((value) => value + 1); return; }
    if (!(await form.trigger())) return;
    try { await saveProfile({ ...form.getValues(), phone: form.getValues().phone || null }); onComplete(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos guardar tu perfil.'); }
  }

  return <View className="flex-1 justify-center gap-7 p-6"><View className="gap-2"><Text className="text-primary text-xs font-bold uppercase tracking-widest">Paso {step + 1} de 3</Text><Text variant="h2">Preparemos tu espacio</Text><Text variant="muted">Estos datos nos ayudan a configurar tu operación.</Text></View><View className="gap-2"><Label>{labels[step]}{step === 2 ? ' (opcional)' : ''}</Label>{step < 2 ? <Controller control={form.control} name={fields[step]} render={({ field: { onBlur, onChange, value } }) => <LocationSelect value={value ?? ''} options={step === 0 ? colombiaDepartments : selectedDepartment?.municipalities ?? []} placeholder={step === 0 ? 'Busca un departamento' : selectedDepartment ? 'Busca una ciudad o municipio' : 'Elige primero un departamento'} disabled={step === 1 && !selectedDepartment} onChange={(nextValue) => { onChange(nextValue); if (step === 0) form.setValue('city', '') }} onBlur={onBlur} />} /> : <Controller control={form.control} name="phone" render={({ field: { onBlur, onChange, value } }) => <Input autoFocus className="h-14 rounded-xl px-4" placeholder="300 000 0000" value={value ?? ''} onChangeText={onChange} onBlur={onBlur} />} />}{form.formState.errors[fields[step]] ? <Text className="text-destructive text-sm">{form.formState.errors[fields[step]]?.message}</Text> : null}</View>{error ? <Text className="text-destructive" accessibilityRole="alert">{error}</Text> : null}<View className="flex-row justify-between gap-3"><Button variant="ghost" disabled={step === 0} onPress={() => setStep((value) => value - 1)}><Text>Atrás</Text></Button><Button onPress={() => void next()} disabled={form.formState.isSubmitting}><Text>{form.formState.isSubmitting ? 'Guardando...' : step === 2 ? 'Guardar perfil' : 'Continuar'}</Text></Button></View></View>;
}

function LocationSelect({ value, options, placeholder, disabled, onChange, onBlur }: { value: string; options: LocationOption[]; placeholder: string; disabled?: boolean; onChange: (value: string) => void; onBlur: () => void }) {
  const [query, setQuery] = React.useState(value);
  const [open, setOpen] = React.useState(false);
  const filtered = options.filter(({ name }) => name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, 80);
  return <View><Input accessibilityRole="combobox" accessibilityState={{ disabled, expanded: open }} className="h-14 rounded-xl px-4" placeholder={placeholder} value={query} editable={!disabled} onFocus={() => setOpen(true)} onChangeText={(text) => { setQuery(text); setOpen(true); onChange('') }} onBlur={() => { onBlur(); setTimeout(() => setOpen(false), 150) }} />{open && !disabled ? <View className="mt-1 max-h-56 rounded-xl border border-border bg-popover p-1">{filtered.length ? filtered.map((option) => <Pressable key={option.code} className="rounded-lg px-3 py-3 active:bg-accent" onPress={() => { onChange(option.name); setQuery(option.name); setOpen(false) }} accessibilityRole="button"><Text>{option.name}</Text></Pressable>) : <Text className="p-3 text-muted-foreground">No encontramos coincidencias.</Text>}</View> : null}</View>;
}

function BusinessOnboarding({ businesses, onComplete }: { businesses: Business[]; onComplete: () => void }) {
  const form = useForm<BusinessOnboardingValues>({ resolver: zodResolver(businessOnboardingSchema), defaultValues: { name: '' } });
  const [error, setError] = React.useState<string | null>(null);
  async function submit(values: BusinessOnboardingValues) { try { const business = await createBusiness(values); await saveActiveBusinessId(business.id); onComplete(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos crear el negocio.'); } }
  async function selectBusiness(id: string) { await saveActiveBusinessId(id); onComplete(); }
  return <View className="flex-1 justify-center gap-7 p-6"><View className="gap-2"><Text variant="h2">{businesses.length ? 'Elige tu negocio' : 'Crea tu primer negocio'}</Text><Text variant="muted">{businesses.length ? 'Selecciona el espacio que quieres abrir.' : 'Aquí registrarás tus ventas, gastos y clientes.'}</Text></View>{businesses.length ? businesses.map((business) => <Pressable key={business.id} className="rounded-xl border border-border p-4" onPress={() => void selectBusiness(business.id)} accessibilityRole="button"><Text className="font-semibold">{business.name}</Text></Pressable>) : <View className="gap-2"><Label>Nombre del negocio</Label><Controller control={form.control} name="name" render={({ field: { onBlur, onChange, value } }) => <Input autoFocus className="h-14 rounded-xl px-4" placeholder="Tienda El Progreso" value={value} onChangeText={onChange} onBlur={onBlur} />} />{form.formState.errors.name ? <Text className="text-destructive text-sm">{form.formState.errors.name.message}</Text> : null}</View>}{error ? <Text className="text-destructive" accessibilityRole="alert">{error}</Text> : null}{!businesses.length ? <Button onPress={form.handleSubmit(submit)} disabled={form.formState.isSubmitting}><Text>{form.formState.isSubmitting ? 'Creando...' : 'Crear negocio'}</Text></Button> : null}</View>;
}
