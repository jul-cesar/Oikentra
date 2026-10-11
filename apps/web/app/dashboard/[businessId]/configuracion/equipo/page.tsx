"use client";

import { useParams } from "next/navigation";

import { CollaboratorsSettings } from "@/components/dashboard/collaborators-settings";

export default function Page() {
  const { businessId } = useParams<{ businessId: string }>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Equipo y permisos
        </h1>
        <p className="mt-2 text-muted-foreground">
          Administra colaboradores, invitaciones y roles del negocio.
        </p>
      </div>
      <CollaboratorsSettings businessId={businessId} />
    </div>
  );
}
