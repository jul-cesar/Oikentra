"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Delete02Icon,
  Mail01Icon,
  MoreVerticalIcon,
  UserGroupIcon,
  UserRemove01Icon,
  UserShield01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  lookupPublicUser,
  type Invitation,
  type Member,
  type PublicUser,
} from "@/lib/members-api";
import {
  useCreateInvitation,
  useInvitations,
  useMembers,
  usePublicUsers,
  useRemoveMember,
  useRevokeInvitation,
  useUpdateMemberRole,
} from "@/lib/queries/members";
import {
  invitationFormSchema,
  type InvitationFormValues,
} from "@/lib/validation/members-schemas";

const invitationStatusLabel: Record<string, string> = {
  PENDING: "Pendiente",
  ACCEPTED: "Aceptada",
  REVOKED: "Revocada",
  EXPIRED: "Expirada",
};

const memberStatusLabel: Record<string, string> = {
  ACTIVE: "Activo",
  INVITED: "Invitado",
  INACTIVE: "Inactivo",
};

const roleLabel: Record<Member["role"] | Invitation["role"], string> = {
  OWNER: "Propietario",
  MANAGER: "Administrador",
  OPERATOR: "Operador",
};

type EditableRole = "MANAGER" | "OPERATOR";
type RoleTarget = { member: Member; role: EditableRole; name: string } | null;
type RemoveTarget = { member: Member; name: string } | null;
type RevokeTarget = Invitation | null;

function initials(value: string) {
  return value.slice(0, 2).toUpperCase();
}

function StatusPill({
  children,
  tone = "muted",
}: {
  children: string;
  tone?: "muted" | "primary";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "primary"
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

export function CollaboratorsSettings({ businessId }: { businessId: string }) {
  const [roleTarget, setRoleTarget] = useState<RoleTarget>(null);
  const [removeTarget, setRemoveTarget] = useState<RemoveTarget>(null);
  const [revokeTarget, setRevokeTarget] = useState<RevokeTarget>(null);
  const members = useMembers(businessId);
  const memberIds = (members.data ?? []).map((member) => member.userId);
  const profiles = usePublicUsers(memberIds);
  const invitations = useInvitations(businessId);
  const create = useCreateInvitation(businessId);
  const revoke = useRevokeInvitation(businessId);
  const updateRole = useUpdateMemberRole(businessId);
  const remove = useRemoveMember(businessId);
  const profileById = useMemo(
    () =>
      new Map((profiles.data ?? []).map((profile) => [profile.id, profile])),
    [profiles.data],
  );
  const form = useForm<InvitationFormValues>({
    resolver: zodResolver(invitationFormSchema),
    defaultValues: { identifier: "", role: "OPERATOR" },
  });

  function memberName(member: Member, profile?: PublicUser) {
    if (member.role === "OWNER") return "Propietario";
    return profile?.name ?? member.userId;
  }

  async function submit(values: InvitationFormValues) {
    try {
      const matches = await lookupPublicUser(values.identifier);
      if (!matches.length) {
        form.setError("identifier", {
          message: "No encontramos una cuenta con ese correo o teléfono.",
        });
        return;
      }
      await create.mutateAsync({ ...values, targetUserId: matches[0].id });
      form.reset();
      toast.add({
        type: "success",
        title: "Invitación creada",
        description: "La invitación se creó correctamente.",
      });
    } catch (cause) {
      form.setError("root.server", {
        message:
          cause instanceof Error
            ? cause.message
            : "No pudimos crear la invitación.",
      });
    }
  }

  async function confirmRoleChange() {
    if (!roleTarget) return;
    const target = roleTarget;
    try {
      await updateRole.mutateAsync({
        memberId: target.member.id,
        role: target.role,
      });
      setRoleTarget(null);
      toast.add({
        type: "success",
        title: "Rol actualizado",
        description: `${target.name} ahora es ${roleLabel[target.role].toLowerCase()}.`,
      });
    } catch (cause) {
      toast.add({
        type: "error",
        title: "No pudimos cambiar el rol",
        description:
          cause instanceof Error
            ? cause.message
            : "Inténtalo nuevamente en unos segundos.",
        priority: "high",
      });
    }
  }

  async function confirmRemoveMember() {
    if (!removeTarget) return;
    const target = removeTarget;
    try {
      await remove.mutateAsync(target.member.id);
      setRemoveTarget(null);
      toast.add({
        type: "success",
        title: "Miembro retirado",
        description: `${target.name} ya no tiene acceso a este negocio.`,
      });
    } catch (cause) {
      toast.add({
        type: "error",
        title: "No pudimos retirar el miembro",
        description:
          cause instanceof Error
            ? cause.message
            : "Inténtalo nuevamente en unos segundos.",
        priority: "high",
      });
    }
  }

  async function confirmRevokeInvitation() {
    if (!revokeTarget) return;
    try {
      await revoke.mutateAsync(revokeTarget.id);
      setRevokeTarget(null);
      toast.add({
        type: "success",
        title: "Invitación revocada",
        description: "La invitación dejó de estar disponible.",
      });
    } catch (cause) {
      toast.add({
        type: "error",
        title: "No pudimos revocar la invitación",
        description:
          cause instanceof Error
            ? cause.message
            : "Inténtalo nuevamente en unos segundos.",
        priority: "high",
      });
    }
  }

  return (
    <Card className="mt-6 overflow-hidden">
      <CardHeader className="gap-2">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <HugeiconsIcon icon={UserGroupIcon} size={18} aria-hidden="true" />
          </span>
          <div>
            <CardTitle>Colaboradores</CardTitle>
            <CardDescription className="mt-1 text-pretty">
              Invita a alguien por correo o teléfono y define qué puede hacer en
              este negocio.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(submit)}
            className="grid gap-4 rounded-2xl border bg-muted/20 p-4 sm:grid-cols-[1fr_190px_auto]"
          >
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo o teléfono</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="persona@correo.com o 3001234567"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPERATOR">Operador</SelectItem>
                        <SelectItem value="MANAGER">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="self-end"
              disabled={create.isPending}
            >
              {create.isPending ? "Enviando…" : "Invitar"}
            </Button>
            {form.formState.errors.root?.server?.message ? (
              <p className="text-sm text-destructive sm:col-span-3">
                {form.formState.errors.root.server.message}
              </p>
            ) : null}
          </form>
        </Form>

        {members.data?.length ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Miembros activos</h3>
              <StatusPill>{`${members.data.length} miembros`}</StatusPill>
            </div>
            <div className="space-y-2">
              {members.data.map((member) => {
                const profile = profileById.get(member.userId);
                const name = memberName(member, profile);
                const nextRole: EditableRole =
                  member.role === "MANAGER" ? "OPERATOR" : "MANAGER";
                return (
                  <div
                    key={member.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border bg-card p-3 text-sm shadow-sm"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <Avatar className="mt-0.5">
                        <AvatarImage src={profile?.image ?? undefined} alt="" />
                        <AvatarFallback>
                          {initials(profile?.name ?? member.userId)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 space-y-1">
                        <p className="truncate font-medium">{name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {profile?.email ??
                            memberStatusLabel[member.status] ??
                            member.status}
                        </p>
                        {profile?.phone ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {profile.phone}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <StatusPill
                            tone={member.role === "OWNER" ? "primary" : "muted"}
                          >
                            {roleLabel[member.role]}
                          </StatusPill>
                          <StatusPill>
                            {memberStatusLabel[member.status] ?? member.status}
                          </StatusPill>
                        </div>
                      </div>
                    </div>
                    {member.role !== "OWNER" ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon-sm" />}
                        >
                          <HugeiconsIcon
                            icon={MoreVerticalIcon}
                            size={16}
                            aria-hidden="true"
                          />
                          <span className="sr-only">Opciones de {name}</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem
                            onClick={() =>
                              setRoleTarget({ member, role: nextRole, name })
                            }
                          >
                            <HugeiconsIcon
                              icon={UserShield01Icon}
                              size={16}
                              aria-hidden="true"
                            />
                            Cambiar a {roleLabel[nextRole].toLowerCase()}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setRemoveTarget({ member, name })}
                          >
                            <HugeiconsIcon
                              icon={UserRemove01Icon}
                              size={16}
                              aria-hidden="true"
                            />
                            Retirar del negocio
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {invitations.data?.length ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Invitaciones</h3>
              <StatusPill>{`${invitations.data.length} invitaciones`}</StatusPill>
            </div>
            <div className="space-y-2">
              {invitations.data.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-start justify-between gap-3 rounded-2xl border bg-card p-3 text-sm shadow-sm"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <HugeiconsIcon
                        icon={Mail01Icon}
                        size={16}
                        aria-hidden="true"
                      />
                    </span>
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-medium">
                        {invitation.identifier}
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <StatusPill tone="primary">
                          {roleLabel[invitation.role]}
                        </StatusPill>
                        <StatusPill>
                          {invitationStatusLabel[invitation.status] ??
                            invitation.status}
                        </StatusPill>
                      </div>
                    </div>
                  </div>
                  {invitation.status === "PENDING" ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon-sm" />}
                      >
                        <HugeiconsIcon
                          icon={MoreVerticalIcon}
                          size={16}
                          aria-hidden="true"
                        />
                        <span className="sr-only">Opciones de invitación</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setRevokeTarget(invitation)}
                        >
                          <HugeiconsIcon
                            icon={Delete02Icon}
                            size={16}
                            aria-hidden="true"
                          />
                          Revocar invitación
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </CardContent>

      <Dialog
        open={Boolean(roleTarget)}
        onOpenChange={(open) => !open && setRoleTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar rol</DialogTitle>
            <DialogDescription>
              Confirma que quieres cambiar a {roleTarget?.name} al rol de{" "}
              {roleTarget ? roleLabel[roleTarget.role].toLowerCase() : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border bg-muted/30 p-3 text-sm">
            Este cambio puede modificar los permisos de la persona dentro del
            negocio.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleTarget(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void confirmRoleChange()}
              disabled={updateRole.isPending}
            >
              {updateRole.isPending ? "Guardando…" : "Confirmar cambio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retirar miembro</DialogTitle>
            <DialogDescription>
              {removeTarget?.name} perderá acceso a este negocio. Esta acción se
              debe confirmar antes de continuar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmRemoveMember()}
              disabled={remove.isPending}
            >
              {remove.isPending ? "Retirando…" : "Retirar miembro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revocar invitación</DialogTitle>
            <DialogDescription>
              La invitación para {revokeTarget?.identifier} dejará de estar
              disponible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmRevokeInvitation()}
              disabled={revoke.isPending}
            >
              {revoke.isPending ? "Revocando…" : "Revocar invitación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
