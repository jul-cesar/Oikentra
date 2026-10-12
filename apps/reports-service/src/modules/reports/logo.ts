import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Rasterized from apps/web/app/brand/oikentra-logo.tsx. Exclusive to reports-service.
const assetsDir = fileURLToPath(new URL('../../../assets/', import.meta.url))

// Plain Oikentra mark (near-black, reads on the green report band).
export const oikentraLogoPngBase64 = readFileSync(`${assetsDir}oikentra-logo.png`).toString('base64')
export const oikentraLogoDataUrl = `data:image/png;base64,${oikentraLogoPngBase64}`

// Brand lockup: white rounded chip with the green mark, used in report headers.
export const oikentraLogoChipBase64 = readFileSync(`${assetsDir}oikentra-logo-chip.png`).toString('base64')
export const oikentraLogoChipDataUrl = `data:image/png;base64,${oikentraLogoChipBase64}`