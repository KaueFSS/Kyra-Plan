/**
 * Country code per timezone. Shown as a small text badge rather than a flag
 * emoji: Windows' emoji font has no country flags and renders them as the
 * bare letters, which looks broken.
 */
const TIMEZONE_COUNTRY: Record<string, string> = {
  "America/Sao_Paulo": "BR",
  "America/New_York": "US",
  "America/Los_Angeles": "US",
  "America/Chicago": "US",
  "America/Mexico_City": "MX",
  "America/Argentina/Buenos_Aires": "AR",
  "Europe/London": "UK",
  "Europe/Lisbon": "PT",
  "Europe/Paris": "FR",
  "Europe/Berlin": "DE",
  "Europe/Moscow": "RU",
  "Asia/Dubai": "AE",
  "Asia/Kolkata": "IN",
  "Asia/Shanghai": "CN",
  "Asia/Tokyo": "JP",
  "Asia/Seoul": "KR",
  "Asia/Singapore": "SG",
  "Australia/Sydney": "AU",
  "Pacific/Auckland": "NZ",
  UTC: "UTC",
};

export function countryForTimezone(timezone: string): string {
  return TIMEZONE_COUNTRY[timezone] ?? timezone.split("/")[0].slice(0, 2).toUpperCase();
}
