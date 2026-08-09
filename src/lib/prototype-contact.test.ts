import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  PUBLIC_V0_DISABLED_CONTACT_HREF,
  TEST_ONLY_CONTACT,
  buildControlledWhatsAppHref,
} from "./prototype-contact";

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);
const TEST_FILE_PATTERN = /\.(?:test|spec)\.[jt]sx?$/;

function sourceFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...sourceFiles(absolutePath));
    } else if (
      SOURCE_EXTENSIONS.has(path.extname(entry.name)) &&
      !TEST_FILE_PATTERN.test(entry.name)
    ) {
      files.push(absolutePath);
    }
  }
  return files;
}

function isTurkishMobileNumberLiteral(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return /^(?:90|0)?5\d{9}$/.test(digits);
}

describe("prototype contact safety boundary", () => {
  test("keeps public V0 contact actions local and non-routable", () => {
    expect(PUBLIC_V0_DISABLED_CONTACT_HREF).toBe("#contact-demo");
    expect(PUBLIC_V0_DISABLED_CONTACT_HREF.startsWith("http")).toBe(false);
    expect(PUBLIC_V0_DISABLED_CONTACT_HREF.startsWith("tel:")).toBe(false);
  });

  test("uses an explicit non-personal sentinel only for Gate 1 browser coverage", () => {
    expect(TEST_ONLY_CONTACT.phoneHref).toBe("tel:0");
    expect(TEST_ONLY_CONTACT.whatsappHref).toBe("https://wa.me/0");

    const href = buildControlledWhatsAppHref("Synthetic Gate 1 payload");
    const url = new URL(href);
    expect(url.origin).toBe("https://wa.me");
    expect(url.pathname).toBe("/0");
    expect(url.searchParams.get("text")).toBe("Synthetic Gate 1 payload");
  });

  test("does not embed Turkish mobile phone literals in current runtime source", () => {
    const phoneLikePattern = /\+?\d[\d\s().-]{8,}\d/g;
    const violations = new Set<string>();

    for (const file of sourceFiles(path.resolve("src"))) {
      const contents = readFileSync(file, "utf8");
      for (const candidate of contents.match(phoneLikePattern) ?? []) {
        if (isTurkishMobileNumberLiteral(candidate)) {
          violations.add(path.relative(process.cwd(), file));
        }
      }
    }

    expect([...violations]).toEqual([]);
  });
});
