"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAcceptInvitation, useMyInvitations } from "@/lib/queries/members";

export function PendingInvitations() {
  const invitations = useMyInvitations();
  const accept = useAcceptInvitation();
  if (!invitations.data?.length) return null;
  return (
    <Card className="mx-auto mb-6 max-w-2xl border-primary/30">
      <CardHeader>
        <CardTitle>Tienes invitaciones</CardTitle>
        <CardDescription>
          Al aceptar podrás entrar al negocio con el rol asignado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {invitations.data.map((invitation) => (
          <div
            key={invitation.id}
            className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium">Invitación a un negocio</p>
              <p className="text-xs text-muted-foreground">
                Rol:{" "}
                {invitation.role === "MANAGER" ? "Administrador" : "Operador"}
              </p>
            </div>
            <Button
              size="sm"
              disabled={accept.isPending}
              onClick={() =>
                void accept.mutateAsync({
                  businessId: invitation.businessId,
                  invitationId: invitation.id,
                })
              }
            >
              {accept.isPending ? "Aceptando…" : "Aceptar invitación"}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
