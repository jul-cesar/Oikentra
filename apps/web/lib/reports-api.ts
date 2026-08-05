export type ReportType =
  | "DAILY_SUMMARY"
  | "WEEKLY_SUMMARY"
  | "RECEIVABLES"
  | "AGED_DEBTS"
  | "CUSTOMER_STATEMENT"
  | "MOVEMENT_HISTORY";

export type ReportFormat = "PDF" | "CSV";

type GenerateReportInput = {
  reportType: ReportType;
  format: ReportFormat;
  from?: string;
  to?: string;
  customerId?: string;
};

export async function generateReport(
  businessId: string,
  input: GenerateReportInput,
): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(
    `/api/reports/businesses/${encodeURIComponent(businessId)}/generate`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, disposition: "ATTACHMENT" }),
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message || "No pudimos generar el reporte.");
  }

  const contentDisposition = response.headers.get("Content-Disposition") ?? "";
  const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
  const filename = filenameMatch?.[1] ?? `reporte.${input.format.toLowerCase()}`;

  const blob = await response.blob();
  return { blob, filename };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
