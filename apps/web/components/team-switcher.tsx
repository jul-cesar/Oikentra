"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UnfoldMoreIcon,
  PlusSignIcon,
  Store01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { saveActiveBusinessId, type Business } from "@/lib/onboarding-api";
import {
  useBusinesses,
  useCreateBusiness,
} from "@/lib/queries/onboarding";

const createBusinessFormSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres."),
});

type CreateBusinessFormValues = z.infer<typeof createBusinessFormSchema>;

export function TeamSwitcher({ currentBusiness }: { currentBusiness: Business }) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { data: businesses, isLoading: loading, error } = useBusinesses();
  const [createOpen, setCreateOpen] = React.useState(false);

  function switchBusiness(id: string) {
    saveActiveBusinessId(id);
    router.push(`/dashboard/${id}`);
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton
                  size="lg"
                  className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
                />
              }
            >
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <HugeiconsIcon icon={Store01Icon} strokeWidth={2} />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{currentBusiness.name}</span>
            <span className="truncate text-xs">Negocio actual</span>
          </div>
          <HugeiconsIcon
            icon={UnfoldMoreIcon}
            strokeWidth={2}
            className="ml-auto"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-64"
          align="start"
          side={isMobile ? "bottom" : "right"}
          sideOffset={4}
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Tus negocios
            </DropdownMenuLabel>
            {loading ? (
              <DropdownMenuItem disabled className="text-muted-foreground">
                Cargando...
              </DropdownMenuItem>
            ) : error ? (
              <DropdownMenuItem disabled className="text-destructive">
                {error.message}
              </DropdownMenuItem>
            ) : (
              (businesses ?? []).map((business) => (
                <DropdownMenuItem
                  key={business.id}
                  onClick={() => switchBusiness(business.id)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <HugeiconsIcon
                      icon={Store01Icon}
                      strokeWidth={2}
                      className="size-4"
                    />
                  </div>
                  <span className="flex-1 truncate">{business.name}</span>
                  {business.id === currentBusiness.id ? (
                    <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-4 text-primary" />
                  ) : null}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="gap-2 p-2"
              onClick={() => setCreateOpen(true)}
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <HugeiconsIcon
                  icon={PlusSignIcon}
                  strokeWidth={2}
                  className="size-4"
                />
              </div>
              <div className="font-medium text-muted-foreground">
                Crear negocio
              </div>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateBusinessDialogContent
        onCreated={(business) => {
          setCreateOpen(false);
          saveActiveBusinessId(business.id);
          router.push(`/dashboard/${business.id}`);
        }}
      />
    </Dialog>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function CreateBusinessDialogContent({
  onCreated,
}: {
  onCreated: (business: Business) => void;
}) {
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const createBusinessMutation = useCreateBusiness();
  const form = useForm<CreateBusinessFormValues>({
    resolver: zodResolver(createBusinessFormSchema),
    defaultValues: { name: "" },
    mode: "onChange",
  });

  async function onSubmit(data: CreateBusinessFormValues) {
    setSubmitError(null);
    try {
      const business = await createBusinessMutation.mutateAsync({
        name: data.name.trim(),
      });
      onCreated(business);
    } catch (cause) {
      setSubmitError(
        cause instanceof Error
          ? cause.message
          : "No pudimos crear el negocio. Inténtalo de nuevo.",
      );
    }
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Crear negocio</DialogTitle>
        <DialogDescription>
          Agrega un nuevo espacio para registrar ventas, gastos y clientes.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form
          id="create-business-form"
          className="grid gap-4 py-2"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del negocio</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Tienda Doña Rosa"
                    autoFocus
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {submitError ? (
            <p className="text-sm text-destructive" role="alert">
              {submitError}
            </p>
          ) : null}
        </form>
      </Form>
      <DialogFooter>
        <DialogClose
          render={
            <Button
              type="button"
              variant="outline"
              disabled={form.formState.isSubmitting}
            >
              Cancelar
            </Button>
          }
        />
        <Button
          type="submit"
          form="create-business-form"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Creando..." : "Crear negocio"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
