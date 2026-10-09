import { z } from 'zod'

import { reportFormats, reportTypes } from './report-types'

export const generateReportSchema = z
  .object({
    reportType: z.enum(reportTypes),
    format: z.enum(reportFormats).default('PDF'),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
    customerId: z.string().min(1).optional(),
    disposition: z.enum(['INLINE', 'ATTACHMENT']).default('INLINE'),
  })
  .superRefine((value, ctx) => {
    if (value.reportType === 'WEEKLY_SUMMARY' || value.reportType === 'MOVEMENT_HISTORY' || value.reportType === 'PAYMENT_METHODS') {
      if (!value.from) {
        ctx.addIssue({ code: 'custom', path: ['from'], message: 'from is required for this report type.' })
      }
      if (!value.to) {
        ctx.addIssue({ code: 'custom', path: ['to'], message: 'to is required for this report type.' })
      }
    }
    if (value.reportType === 'CUSTOMER_STATEMENT' && !value.customerId) {
      ctx.addIssue({ code: 'custom', path: ['customerId'], message: 'customerId is required for this report type.' })
    }
    if (value.from && value.to && value.from > value.to) {
      ctx.addIssue({ code: 'custom', path: ['to'], message: 'to must be after from.' })
    }
  })

export const reportParamsSchema = z.object({
  businessId: z.string().min(1),
})
