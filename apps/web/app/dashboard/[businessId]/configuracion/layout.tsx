import { BusinessSettingsLayout } from "@/components/dashboard/business-settings-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <BusinessSettingsLayout>{children}</BusinessSettingsLayout>;
}
