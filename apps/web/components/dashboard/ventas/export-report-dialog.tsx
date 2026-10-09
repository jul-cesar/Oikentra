"use client";

import { useState } from "react";
import { Download01Icon, File01Icon, FilesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { downloadBlob, generateReport, type ReportFormat, type ReportType } from "@/lib/reports-api";

const REPORT_TYPES: Array<{ value: ReportType; label: string }> = [
  { value: "DAILY_SUMMARY", label: "Resumen del día" },
  { value: "WEEKLY_SUMMARY", label: "Resumen del período" },
  { value: "PAYMENT_METHODS", label: "Ventas por medio de pago" },
  { value: "RECEIVABLES", label: "Fiados por cobrar" },
  { value: "AGED_DEBTS", label: "Fiados antiguos" },
  { value: "MOVEMENT_HISTORY", label: "Historial de movimientos" },
];

const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

type Props = {
  businessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialReportType?: ReportType;
  initialFrom?: string;
  initialTo?: string;
  fixedReportType?: ReportType;
  customerId?: string;
};

export function ExportReportDialog(props: Props) {
  return props.open ? <OpenExportReportDialog {...props} /> : null;
}

function OpenExportReportDialog({
  businessId, open, onOpenChange, initialReportType = "WEEKLY_SUMMARY",
  initialFrom, initialTo, fixedReportType, customerId,
}: Props) {
  const [reportType, setReportType] = useState<ReportType>(fixedReportType ?? initialReportType);
  const [format, setFormat] = useState<ReportFormat>("PDF");
  const [from, setFrom] = useState(initialFrom ?? today());
  const [to, setTo] = useState(initialTo ?? today());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const needsRange = reportType === "WEEKLY_SUMMARY" || reportType === "MOVEMENT_HISTORY" || reportType === "PAYMENT_METHODS";
  const needsDay = reportType === "DAILY_SUMMARY";
  const invalidDate = (needsDay && !from) || (needsRange && (!from || !to || from > to));

  async function handleExport() {
    if (invalidDate || loading) return;
    setLoading(true);
    setError("");
    try {
      const input: {
        reportType: ReportType; format: ReportFormat;
        from?: string; to?: string; customerId?: string;
      } = { reportType, format };
      if (needsRange || needsDay) input.from = from;
      if (needsRange) input.to = to;
      if (reportType === "CUSTOMER_STATEMENT") input.customerId = customerId;
      const { blob, filename } = await generateReport(businessId, input);
      downloadBlob(blob, filename);
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos generar el reporte.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Descargar reporte</DialogTitle>
          <DialogDescription>
            Elige el formato para guardar o compartir los datos de tu negocio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!fixedReportType ? (
            <div className="space-y-2">
              <Label htmlFor="report-type">Tipo de reporte</Label>
              <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
                <SelectTrigger id="report-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="rounded-xl bg-primary/10 px-3 py-2 text-sm font-medium text-foreground">
              {REPORT_TYPES.find((item) => item.value === reportType)?.label ?? "Estado de cuenta"}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="report-format">Formato</Label>
            <Select value={format} onValueChange={(value) => setFormat(value as ReportFormat)}>
              <SelectTrigger id="report-format" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PDF"><span className="flex items-center gap-2"><HugeiconsIcon icon={File01Icon} size={16} />PDF · compartir o imprimir</span></SelectItem>
                <SelectItem value="CSV"><span className="flex items-center gap-2"><HugeiconsIcon icon={FilesIcon} size={16} />CSV · datos editables</span></SelectItem>
                <SelectItem value="XLSX"><span className="flex items-center gap-2"><HugeiconsIcon icon={FilesIcon} size={16} />Excel (.xlsx) · tabla con formato</span></SelectItem>
              </SelectContent>
            </Select>
          </div>

          {needsRange || needsDay ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="report-from">{needsDay ? "Día" : "Desde"}</Label>
                <input id="report-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              {needsRange ? (
                <div className="space-y-2">
                  <Label htmlFor="report-to">Hasta</Label>
                  <input id="report-to" type="date" value={to} onChange={(event) => setTo(event.target.value)}
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
              ) : null}
            </div>
          ) : null}
          {invalidDate && from && to ? <p className="text-sm text-destructive">La fecha final debe ser igual o posterior a la inicial.</p> : null}
          {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button type="button" onClick={() => void handleExport()} disabled={loading || invalidDate}>
            <HugeiconsIcon icon={Download01Icon} size={16} aria-hidden="true" />
            {loading ? "Generando…" : "Descargar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
