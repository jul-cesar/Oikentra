"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Building01Icon, CheckmarkCircle02Icon, Loading03Icon, Mail01Icon, SecurityCheckIcon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAcceptInvitation, useMyInvitations, usePublicUsers } from "@/lib/queries/members"

export function PendingInvitations() {
  const invitations = useMyInvitations()
  const accept = useAcceptInvitation()
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const inviterIds = (invitations.data ?? []).map((invitation) => invitation.invitedByUserId)
  const inviters = usePublicUsers(inviterIds)

  if (!invitations.data?.length) return null

  async function onAccept(businessId: string, invitationId: string) {
    setAcceptingId(invitationId)
    try {
      await accept.mutateAsync({ businessId, invitationId })
    } finally {
      setAcceptingId(null)
    }
  }

  return (
    <Card className="mx-auto mb-6 w-full max-w-2xl overflow-hidden border-primary/30">
      <CardHeader className="gap-1.5">
        <CardTitle className="flex items-center gap-2 text-balance">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <HugeiconsIcon icon={Mail01Icon} size={16} aria-hidden="true" />
          </span>
          Tienes invitaciones
        </CardTitle>
        <CardDescription className="text-pretty">
          Al aceptar podrás entrar al negocio con el rol asignado.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {invitations.data.map((invitation) => {
          const isAccepting = acceptingId === invitation.id
          const roleLabel =
            invitation.role === "MANAGER" ? "Administrador" : "Operador"

          return (
            <div
              key={invitation.id}
              className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              {/* min-w-0 lets long names truncate instead of blowing out the row */}
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                  <HugeiconsIcon icon={Building01Icon} size={16} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {invitation.businessName ?? "Invitación a un negocio"}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                      <HugeiconsIcon icon={SecurityCheckIcon} size={12} aria-hidden="true" />
                      {roleLabel}
                    </span>
                    <span className="truncate">
                      · de {inviters.data?.find((user) => user.id === invitation.invitedByUserId)?.name ?? "el propietario"}
                    </span>
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                className="w-full shrink-0 sm:w-auto"
                disabled={isAccepting}
                onClick={() => onAccept(invitation.businessId, invitation.id)}
              >
                {isAccepting ? (
                  <>
                    <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin" aria-hidden="true" />
                    Aceptando…
                  </>
                ) : (
                  <>
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} aria-hidden="true" />
                    Aceptar invitación
                  </>
                )}
              </Button>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
