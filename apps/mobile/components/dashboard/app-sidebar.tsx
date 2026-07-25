import { BrandMark } from '@/components/auth/brand-mark';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { saveActiveBusinessId, type Business } from '@/lib/onboarding-api';
import { useBusinesses, useCreateBusiness } from '@/lib/queries/onboarding';
import { useThemePreference } from '@/lib/theme-context';
import { cn } from '@/lib/utils';
import {
  createBusinessFormSchema,
  type CreateBusinessFormValues,
} from '@/lib/validation/onboarding-schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  Store,
  Users,
  Sun,
  SunMoon,
  User,
  Wallet,
  DollarSign,
} from 'lucide-react-native';
import { Href, usePathname, useRouter } from 'expo-router';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AppSidebarProps = {
  business: Business;
  user: { name?: string | null; email?: string };
  onSignOut: () => void;
};

const TABLET_BREAKPOINT = 768;

export function AppSidebar({ business, user, onSignOut }: AppSidebarProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  if (isTablet) {
    return <SidebarContent business={business} user={user} onSignOut={onSignOut} />;
  }

  return (
    <>
      <View className="absolute top-0 left-0 z-20 p-4">
        <Button
          variant="ghost"
          size="icon"
          onPress={() => setDrawerOpen(true)}
          accessibilityLabel="Abrir menú">
          <Icon as={Menu} className="text-foreground size-6" />
        </Button>
      </View>
      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="m-0 h-full max-h-full w-[85%] max-w-[320px] rounded-none border-r p-0">
          <SidebarContent
            business={business}
            user={user}
            onSignOut={onSignOut}
            onNavigate={() => setDrawerOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function SidebarContent({
  business,
  user,
  onSignOut,
  onNavigate,
}: AppSidebarProps & { onNavigate?: () => void }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const base = `/dashboard/${business.id}`;

  const navItems = [
    { label: 'Resumen', href: base, icon: LayoutDashboard },
    { label: 'Clientes', href: `${base}/clientes`, icon: Users },
    { label: 'Ventas', href: `${base}/ventas`, icon: DollarSign },
    { label: 'Fiados', href: `${base}/fiados`, icon: Wallet },
    { label: 'Configurar negocio', href: `${base}/configuracion`, icon: Settings },
  ];

  function navigate(href: string) {
    router.navigate(href as Parameters<typeof router.navigate>[0]);
    onNavigate?.();
  }

  return (
    <View
      className="border-border bg-sidebar h-full w-full max-w-[288px] flex-col border-r"
      style={{ paddingTop: Platform.OS === 'ios' ? insets.top : 16 }}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="gap-6 p-4">
          <View className="px-2">
            <BrandMark compact />
          </View>

          <BusinessSwitcher currentBusiness={business} onNavigate={onNavigate} />

          <View className="gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const IconComponent = item.icon;
              return (
                <Pressable
                  key={item.href}
                  onPress={() => navigate(item.href)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  className={cn(
                    'flex-row items-center gap-3 rounded-lg px-3 py-3',
                    active ? 'bg-sidebar-accent' : 'active:bg-sidebar-accent/50'
                  )}>
                  <Icon
                    as={IconComponent}
                    className={cn(
                      'size-5',
                      active ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground'
                    )}
                  />
                  <Text
                    className={cn(
                      'text-sm font-medium',
                      active ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground'
                    )}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View className="border-sidebar-border gap-3 border-t p-4">
        <ThemeOptions />
        <Separator className="bg-sidebar-border" />
        <Pressable
          onPress={() => navigate(`${base}/perfil`)}
          accessibilityRole="button"
          className="active:bg-sidebar-accent/50 flex-row items-center gap-3 rounded-lg px-2 py-2">
          <View className="bg-sidebar-primary size-9 items-center justify-center rounded-full">
            <Icon as={User} className="text-sidebar-primary-foreground size-4" />
          </View>
          <View className="flex-1">
            <Text className="text-sidebar-foreground text-sm font-medium" numberOfLines={1}>
              {user.name || 'Usuario'}
            </Text>
            <Text className="text-sidebar-foreground/70 text-xs" numberOfLines={1}>
              {user.email}
            </Text>
          </View>
        </Pressable>
        <Button variant="ghost" className="justify-start gap-3 px-2" onPress={onSignOut}>
          <Icon as={LogOut} className="text-sidebar-foreground size-[18px]" />
          <Text className="text-sidebar-foreground">Cerrar sesión</Text>
        </Button>
      </View>
    </View>
  );
}

function BusinessSwitcher({
  currentBusiness,
  onNavigate,
}: {
  currentBusiness: Business;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const { data: businesses, isPending, error } = useBusinesses();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  async function switchBusiness(id: string) {
    await saveActiveBusinessId(id);
    router.replace(`/dashboard/${id}` as Href);
    setExpanded(false);
    onNavigate?.();
  }

  return (
    <View className="gap-2">
      <Pressable
        onPress={() => setExpanded((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        className="border-sidebar-border bg-background active:bg-accent flex-row items-center gap-3 rounded-lg border p-3">
        <View className="bg-sidebar-primary size-9 items-center justify-center rounded-lg">
          <Icon as={Store} className="text-sidebar-primary-foreground size-[18px]" />
        </View>
        <View className="flex-1">
          <Text className="text-sidebar-foreground text-sm font-medium" numberOfLines={1}>
            {currentBusiness.name}
          </Text>
          <Text className="text-sidebar-foreground/70 text-xs">Negocio actual</Text>
        </View>
        <Text className="text-sidebar-foreground/70 text-xs">{expanded ? '▲' : '▼'}</Text>
      </Pressable>

      {expanded ? (
        <View className="border-sidebar-border bg-background gap-1 rounded-lg border p-1">
          {isPending ? (
            <Text className="text-muted-foreground p-3 text-sm">Cargando...</Text>
          ) : error ? (
            <Text className="text-destructive p-3 text-sm">{error.message}</Text>
          ) : (
            (businesses ?? []).map((business) => (
              <Pressable
                key={business.id}
                onPress={() => void switchBusiness(business.id)}
                accessibilityRole="button"
                className="active:bg-accent flex-row items-center gap-3 rounded-md px-3 py-2.5">
                <Icon as={Store} className="text-muted-foreground size-4" />
                <Text
                  className={cn(
                    'flex-1 text-sm',
                    business.id === currentBusiness.id
                      ? 'text-sidebar-foreground font-semibold'
                      : 'text-muted-foreground'
                  )}
                  numberOfLines={1}>
                  {business.name}
                </Text>
                {business.id === currentBusiness.id ? (
                  <Text className="text-primary text-xs">●</Text>
                ) : null}
              </Pressable>
            ))
          )}
          <Button
            variant="ghost"
            className="justify-start gap-3 px-3"
            onPress={() => setCreateOpen(true)}>
            <Text className="text-muted-foreground text-lg leading-none">+</Text>
            <Text className="text-muted-foreground text-sm">Crear negocio</Text>
          </Button>
        </View>
      ) : null}

      <CreateBusinessDialog open={createOpen} onOpenChange={setCreateOpen} />
    </View>
  );
}

function CreateBusinessDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const createBusinessMutation = useCreateBusiness();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const form = useForm<CreateBusinessFormValues>({
    resolver: zodResolver(createBusinessFormSchema),
    defaultValues: { name: '' },
  });

  async function onSubmit(values: CreateBusinessFormValues) {
    setSubmitError(null);
    try {
      const business = await createBusinessMutation.mutateAsync({ name: values.name.trim() });
      await saveActiveBusinessId(business.id);
      onOpenChange(false);
      router.replace(`/dashboard/${business.id}` as Href);
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : 'No pudimos crear el negocio.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear negocio</DialogTitle>
          <DialogDescription>
            Agrega un nuevo espacio para registrar ventas, gastos y clientes.
          </DialogDescription>
        </DialogHeader>
        <View className="gap-4 py-2">
          <View className="gap-2">
            <Label>Nombre del negocio</Label>
            <Controller
              control={form.control}
              name="name"
              render={({ field: { onBlur, onChange, value } }) => (
                <Input
                  autoFocus
                  placeholder="Tienda Doña Rosa"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                />
              )}
            />
            {form.formState.errors.name ? (
              <Text className="text-destructive text-sm">{form.formState.errors.name.message}</Text>
            ) : null}
          </View>
          {submitError ? (
            <Text className="text-destructive text-sm" accessibilityRole="alert">
              {submitError}
            </Text>
          ) : null}
        </View>
        <DialogFooter>
          <DialogClose asChild>
            <Button
              variant="outline"
              onPress={() => onOpenChange(false)}
              disabled={form.formState.isSubmitting}>
              <Text>Cancelar</Text>
            </Button>
          </DialogClose>
          <Button onPress={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
            <Text>{form.formState.isSubmitting ? 'Creando...' : 'Crear negocio'}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ThemeOptions() {
  const { preference, setPreference } = useThemePreference();

  const options: { value: typeof preference; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Claro', icon: Sun },
    { value: 'dark', label: 'Oscuro', icon: Moon },
    { value: 'system', label: 'Sistema', icon: SunMoon },
  ];

  return (
    <View className="gap-2">
      <Text className="text-sidebar-foreground/70 px-2 text-xs font-medium tracking-wider uppercase">
        Tema
      </Text>
      <View className="flex-row gap-2 px-2">
        {options.map((option) => {
          const active = preference === option.value;
          const IconComponent = option.icon;
          return (
            <Pressable
              key={option.value}
              onPress={() => setPreference(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              className={cn(
                'flex-1 flex-row items-center justify-center gap-2 rounded-md py-2',
                active ? 'bg-sidebar-accent' : 'bg-sidebar-accent/20 active:bg-sidebar-accent/40'
              )}>
              <Icon
                as={IconComponent}
                className={cn(
                  'size-3.5',
                  active ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground'
                )}
              />
              <Text
                className={cn(
                  'text-xs',
                  active ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground'
                )}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
