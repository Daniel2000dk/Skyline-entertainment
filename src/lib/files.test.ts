import { describe, expect, it } from "vitest";
import { cleanFileName, detectFileType, formatFileSize } from "./files";

const bytes = (...values: number[]) => new Uint8Array([...values, ...new Array(16).fill(0)]);
const text = (value: string) => new TextEncoder().encode(value);

describe("detectFileType", () => {
  it.each([
    ["PNG", bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), "image/png"],
    ["JPEG", bytes(0xff, 0xd8, 0xff, 0xe0), "image/jpeg"],
    ["GIF", text("GIF89a......"), "image/gif"],
    ["WebP", text("RIFF\u0000\u0000\u0000\u0000WEBPVP8 "), "image/webp"],
    ["PDF", text("%PDF-1.7\n"), "application/pdf"],
  ])("recognizes %s by its content", (_label, content, type) => {
    expect(detectFileType(content)?.contentType).toBe(type);
  });

  it.each([
    ["SVG (can contain scripts)", text('<svg xmlns="http://www.w3.org/2000/svg"><script>')],
    ["HTML", text("<!doctype html><script>alert(1)</script>")],
    ["a script renamed to .png", text("#!/bin/sh\nrm -rf /")],
    ["a ZIP archive", bytes(0x50, 0x4b, 0x03, 0x04)],
    ["an empty file", new Uint8Array()],
  ])("refuses %s", (_label, content) => {
    expect(detectFileType(content)).toBeNull();
  });
});

describe("cleanFileName", () => {
  it("keeps only a safe display name", () => {
    expect(cleanFileName("../../etc/passwd")).toBe("passwd");
    expect(cleanFileName("C:\\fotos\\route.png")).toBe("route.png");
    expect(cleanFileName('plan<script>"x".pdf')).toBe("planscriptx.pdf");
    expect(cleanFileName("   ")).toBe("bestand");
  });
});

describe("formatFileSize", () => {
  it("formats bytes for humans", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2 kB");
    expect(formatFileSize(3.5 * 1024 * 1024)).toBe("3,5 MB");
  });
});
