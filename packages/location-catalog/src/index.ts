import catalog from '../colombia.json'

export type LocationOption = { code: string; name: string }
export type Department = LocationOption & { municipalities: LocationOption[] }

export const colombiaDepartments = catalog as Department[]
