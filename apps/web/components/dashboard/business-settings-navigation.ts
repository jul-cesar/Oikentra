import type { Business } from "@/lib/onboarding-api";

export type BusinessSettingsItem = {
  title: string;
  description: string;
  href: string;
  match: "exact" | "prefix";
};

export function getBusinessSettingsItems(
  businessId: string,
  role: Business["role"],
): BusinessSettingsItem[] {
  if (role === "OPERATOR") return [];

  const base = `/dashboard/${businessId}/configuracion`;
  const items: BusinessSettingsItem[] = [
    {
      title: "General",
      description: "Datos e identidad de tu negocio.",
      href: base,
      match: "exact",
    },
    {
      title: "Medios de pago",
      description: "Opciones disponibles al registrar ventas.",
      href: `${base}/medios-de-pago`,
      match: "exact",
    },
  ];

  if (role === "OWNER") {
    items.push({
      title: "Equipo y permisos",
      description: "Miembros, invitaciones y permisos.",
      href: `${base}/equipo`,
      match: "exact",
    });
  }

  return items;
}

export function canAccessBusinessSettingsPath(
  pathname: string,
  businessId: string,
  role: Business["role"],
) {
  return getBusinessSettingsItems(businessId, role).some(
    ({ href }) => pathname === href,
  );
}

export function isBusinessSettingsPath(
  pathname: string,
  businessId: string,
) {
  const base = `/dashboard/${businessId}/configuracion`;
  return pathname === base || pathname.startsWith(`${base}/`);
}
