import { describe, it, expect } from "vitest";
import { buildPageList } from "./pagination";

describe("buildPageList", () => {
  it("hanya [1] kalau total halaman 1 atau kurang", () => {
    expect(buildPageList(1, 1)).toEqual([1]);
    expect(buildPageList(1, 0)).toEqual([1]);
  });

  it("total kecil (<=5) menampilkan semua tanpa ellipsis", () => {
    expect(buildPageList(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("halaman aktif di tengah dari total besar: ellipsis di kedua sisi", () => {
    expect(buildPageList(10, 20)).toEqual([1, "ellipsis", 9, 10, 11, "ellipsis", 20]);
  });

  it("halaman aktif di awal: ellipsis cuma di kanan", () => {
    expect(buildPageList(1, 20)).toEqual([1, 2, "ellipsis", 20]);
  });

  it("halaman aktif di akhir: ellipsis cuma di kiri", () => {
    expect(buildPageList(20, 20)).toEqual([1, "ellipsis", 19, 20]);
  });

  it("halaman aktif dekat awal (tanpa celah nyata): tidak ada ellipsis ganda", () => {
    expect(buildPageList(2, 20)).toEqual([1, 2, 3, "ellipsis", 20]);
  });
});