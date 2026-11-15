import type { AppLanguage } from "@/utils/app-copy";

export function formatRefundAmount(amount: string, language: AppLanguage) {
  return new Intl.NumberFormat(language, { style: "currency", currency: "BRL" }).format(Number(amount));
}

export function formatRefundDeadline(dueOn: string, language: AppLanguage) {
  return new Intl.DateTimeFormat(language, { dateStyle: "medium", timeZone: "UTC" })
    .format(new Date(`${dueOn}T00:00:00Z`));
}

export function formatRefundTime(instant: string, language: AppLanguage) {
  return new Intl.DateTimeFormat(language, {
    dateStyle: "short", timeStyle: "medium", timeZone: "Etc/GMT+3",
  }).format(new Date(instant));
}
