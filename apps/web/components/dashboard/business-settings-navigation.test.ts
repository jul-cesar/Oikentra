import assert from "node:assert/strict";
import test from "node:test";

const navigation = await import(
  new URL("./business-settings-navigation.ts", import.meta.url).href
);
const {
  canAccessBusinessSettingsPath,
  getBusinessSettingsItems,
  isBusinessSettingsPath,
} = navigation;

test("shows managers only the settings pages they can access", () => {
  assert.deepEqual(
    getBusinessSettingsItems("business-1", "MANAGER").map(
      ({ title, href }: { title: string; href: string }) => ({ title, href }),
    ),
    [
      { title: "General", href: "/dashboard/business-1/configuracion" },
      {
        title: "Medios de pago",
        href: "/dashboard/business-1/configuracion/medios-de-pago",
      },
    ],
  );
});

test("enforces settings access by role", () => {
  assert.equal(
    canAccessBusinessSettingsPath(
      "/dashboard/business-1/configuracion/equipo",
      "business-1",
      "MANAGER",
    ),
    false,
  );
  assert.equal(
    canAccessBusinessSettingsPath(
      "/dashboard/business-1/configuracion/equipo",
      "business-1",
      "OWNER",
    ),
    true,
  );
  assert.equal(
    canAccessBusinessSettingsPath(
      "/dashboard/business-1/configuracion",
      "business-1",
      "OPERATOR",
    ),
    false,
  );
  assert.equal(
    canAccessBusinessSettingsPath(
      "/dashboard/business-1/configuracion/desconocida",
      "business-1",
      "OWNER",
    ),
    false,
  );
});

test("matches only the selected business settings path", () => {
  assert.equal(
    isBusinessSettingsPath(
      "/dashboard/business-1/configuracion/medios-de-pago",
      "business-1",
    ),
    true,
  );
  assert.equal(
    isBusinessSettingsPath(
      "/dashboard/business-10/configuracion",
      "business-1",
    ),
    false,
  );
});
