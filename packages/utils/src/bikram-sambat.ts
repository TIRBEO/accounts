type BsDate = {
  year: number;
  month: number;
  day: number;
};

const BS_MONTHS = [
  "Baisakh", "Jestha", "Ashad", "Shrawan",
  "Bhadra", "Ashwin", "Kartik", "Mangsir",
  "Poush", "Magh", "Falgun", "Chaitra",
] as const;

const BS_MONTHS_DAYS: Record<number, number[]> = {
  2000: [30, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2001: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2002: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2003: [31, 32, 31, 32, 31, 30, 30, 29, 30, 30, 29, 30],
  2004: [31, 32, 31, 32, 31, 30, 30, 29, 30, 30, 29, 30],
  2005: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 30],
  2006: [31, 31, 31, 32, 31, 30, 30, 30, 29, 30, 29, 30],
  2007: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 29],
  2008: [31, 31, 32, 31, 31, 31, 30, 29, 30, 30, 30, 29],
  2009: [31, 32, 31, 32, 31, 30, 30, 29, 30, 30, 30, 29],
};

const BS_EPOCH_YEAR = 2000;
const AD_EPOCH = new Date(1943, 3, 14);

export function adToBs(date: Date): BsDate {
  const target = new Date(date);
  let bsYear = BS_EPOCH_YEAR;
  let diff = Math.floor((target.getTime() - AD_EPOCH.getTime()) / (1000 * 60 * 60 * 24));
  let monthIndex = 0;

  while (diff > 0) {
    const yearDays = BS_MONTHS_DAYS[bsYear];
    if (!yearDays) {
      bsYear++;
      continue;
    }
    for (let m = 0; m < 12; m++) {
      if (diff <= yearDays[m]) {
        monthIndex = m;
        return { year: bsYear, month: m + 1, day: diff };
      }
      diff -= yearDays[m];
    }
    bsYear++;
  }

  return { year: bsYear, month: 1, day: 1 };
}

export function bsToAd(bsDate: BsDate): Date {
  let totalDays = 0;

  for (let y = BS_EPOCH_YEAR; y < bsDate.year; y++) {
    const yearDays = BS_MONTHS_DAYS[y];
    if (yearDays) {
      totalDays += yearDays.reduce((a, b) => a + b, 0);
    }
  }

  const yearDays = BS_MONTHS_DAYS[bsDate.year];
  if (yearDays) {
    for (let m = 0; m < bsDate.month - 1; m++) {
      totalDays += yearDays[m];
    }
  }

  totalDays += bsDate.day - 1;
  return new Date(AD_EPOCH.getTime() + totalDays * 86400000);
}

export function getCurrentBsDate(): BsDate {
  return adToBs(new Date());
}

export function formatBsDate(bsDate: BsDate, format: "full" | "short" = "full"): string {
  if (format === "short") {
    return `${bsDate.year}/${String(bsDate.month).padStart(2, "0")}/${String(bsDate.day).padStart(2, "0")}`;
  }
  return `${BS_MONTHS[bsDate.month - 1]} ${bsDate.day}, ${bsDate.year}`;
}

export function getBsMonthName(month: number): string {
  return BS_MONTHS[month - 1] || "";
}

export function getDaysInBsMonth(year: number, month: number): number {
  const yearDays = BS_MONTHS_DAYS[year];
  if (!yearDays) return 30;
  return yearDays[month - 1] || 30;
}
