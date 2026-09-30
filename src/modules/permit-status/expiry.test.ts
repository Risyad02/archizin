import { describe, it, expect } from "vitest";
import { computeExpiryBadge } from "./expiry";
import type { StatusRule } from "./types";

function rule(threshold: number): StatusRule {
  return {
    id: threshold,
    based_on: "tanggal_berakhir",
    threshold_days: threshold,
    resulting_status_id: 1,
    resulting_code: "akan_berakhir",
    resulting_label: "Akan Berakhir",
    resulting_color: "#eab308",
  };
}

const rules = [rule(7), rule(14), rule(30), rule(60), rule(90)];

function dateInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

describe("computeExpiryBadge", () => {
  it("return null kalau tanggal_berakhir kosong", () => {
    expect(computeExpiryBadge(null, rules)).toBeNull();
  });

  it("return null kalau masih jauh (di luar semua ambang)", () => {
    expect(computeExpiryBadge(dateInDays(120), rules)).toBeNull();
  });

  it("masuk bucket H-90 kalau tersisa 75 hari", () => {
    const badge = computeExpiryBadge(dateInDays(75), rules);
    expect(badge?.label).toContain("H-75");
    expect(badge?.overdue).toBe(false);
  });

  it("masuk bucket paling ketat (H-7) kalau tersisa 5 hari, bukan bucket yang lebih longgar", () => {
    const badge = computeExpiryBadge(dateInDays(5), rules);
    expect(badge?.label).toContain("H-5");
  });

  it("tepat di ambang batas (persis 30 hari) ikut masuk bucket itu", () => {
    const badge = computeExpiryBadge(dateInDays(30), rules);
    expect(badge?.label).toContain("H-30");
  });

  it("kedaluwarsa kalau sudah lewat tanggal_berakhir", () => {
    const badge = computeExpiryBadge(dateInDays(-10), rules);
    expect(badge?.overdue).toBe(true);
    expect(badge?.label).toContain("10 hari lalu");
  });

  it("hari ini (H-0) tetap masuk bucket paling ketat, bukan dianggap kedaluwarsa", () => {
    const badge = computeExpiryBadge(dateInDays(0), rules);
    expect(badge?.overdue).toBe(false);
    expect(badge?.label).toContain("H-0");
  });
});