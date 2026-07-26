"use client";

import { useState } from "react";
import {
  Download01Icon,
  File01Icon,
  FilesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateReport, downloadBlob, type ReportType, type ReportFormat } from "@/lib/reports-api";

const REPORT_TYPES = [
  { value: "DAILY_SUMMARY", label: "Resumen del día" },
  { value: "WEEKLY_SUMMARY", label: "Resumen semanal" },
  { value: "RECEIVABLES", label: "Cuentas por cobrar" },
  { value: "AGED_DEBTS", label: "Deudas antiguas" },
  { value: "MOVEMENT_HISTORY", label: "Historial de movimientos" },
] as const;

const DATE_REQUIRED = new Set(["WEEKLY_SUMMARY", "MOVEMENT_HISTORY"]);

const today = () => new Date().toISOString().slice(0, 10);

export function ExportReportDialog({
  businessId,
  open,
  onOpenChange,
}: {
  businessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reportType, setReportType] = useState<ReportType>("DAILY_SUMMARY");
  const [format, setFormat] = useState<ReportFormat>("PDF");
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const needsDate = DATE_REQUIRED.has(reportType);

  async function handleExport() {
    setLoading(true);
    setError("");
    try {
      const input: {
        reportType: ReportType;
        format: ReportFormat;
        from?: string;
        to?: string;
      } = { reportType, format };
      if (needsDate) {
        input.from = from;
        input.to = to;
      }
      const { blob, filename } = await generateReport(businessId, input);
      downloadBlob(blob, filename);
      onOpenChange(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No pudimos generar el reporte.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar reporte</DialogTitle>
          <DialogDescription>
            Genera un archivo con los datos de tu negocio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de reporte</Label>
            <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((rt) => (
                  <SelectItem key={rt.value} value={rt.value}>
                    {rt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Formato</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as ReportFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PDF">
                  <span className="flex items-center gap-2">
                    <HugeiconsIcon icon={File01Icon} size={14} />
                    PDF
                  </span>
                </SelectItem>
                <SelectItem value="CSV">
                  <span className="flex items-center gap-2">
                    <HugeiconsIcon icon={FilesIcon} size={14} />
                    CSV
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {needsDate ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Desde</Label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <Label>Hasta</Label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={() => void handleExport()} disabled={loading}>
            <HugeiconsIcon icon={Download01Icon} size={16} aria-hidden="true" />
            {loading ? "Generando…" : "Descargar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
