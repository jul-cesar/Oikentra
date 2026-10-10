"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  getActiveBusinessSettingsItem,
  getBusinessSettingsItems,
} from "@/components/dashboard/business-settings-navigation";
import type { Business } from "@/lib/onboarding-api";
import { cn } from "@/lib/utils";

export function BusinessSettingsNav({
  businessId,
  role,
}: {
  businessId: string;
  role: Business["role"];
}) {
  const pathname = usePathname();
  const items = getBusinessSettingsItems(businessId, role);
  const activeItem = getActiveBusinessSettingsItem(pathname, items);

  return (
    <nav aria-label="Configuración del negocio">
      <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {items.map((item) => {
          const active = item.href === activeItem?.href;

          return (
            <li key={item.href} className="shrink-0 lg:shrink">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-xl border px-4 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  active
                    ? "border-primary/30 bg-primary/10 text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <span className="block font-medium">{item.title}</span>
                <span className="mt-1 hidden text-xs text-muted-foreground lg:block">
                  {item.description}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
