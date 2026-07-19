export function isProfileComplete(profile: {
  countryCode: string
  department?: string | null
  city: string
}) {
  return Boolean(profile.countryCode && profile.city && (profile.countryCode !== 'CO' || profile.department))
}
