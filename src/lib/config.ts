export const config = {
  apiBaseUrl: (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, ""),
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001",
  siteName: process.env.NEXT_PUBLIC_SITE_NAME ?? "Ecojindu Operations",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "jinduinc@gmail.com",
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "+234 815 447 1570",
  lowOccupancyThreshold: Number(process.env.NEXT_PUBLIC_LOW_OCCUPANCY_THRESHOLD ?? 30),
} as const;
