import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.QA_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({
  channel: process.env.QA_BROWSER || "chrome",
  headless: true,
});
const results = [],
  errors = [];
await mkdir("qa", { recursive: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const check = async (name, fn) => {
  await fn();
  results.push({ name, status: "PASS" });
  console.log("PASS", name);
};
const saved = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("fitcheck.rdr.v1")));
const shot = async (file) => {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `qa/${file}`,
    fullPage: true,
    animations: "disabled",
  });
};
const fillCase = async (occasion = "Casual", temperature = "25") => {
  await page
    .getByRole("combobox", { name: "Acara", exact: true })
    .selectOption(occasion);
  await page.getByLabel("Suhu udara").fill(temperature);
  await page.getByRole("button", { name: "Temukan outfit" }).click();
};
const correct = async (conclusion) => {
  await page.getByRole("button", { name: "Koreksi", exact: true }).click();
  await page.getByLabel("Outfit yang tepat").selectOption(conclusion);
};
try {
  await page.goto(base, { waitUntil: "networkidle", timeout: 60000 });
  await check("AC-01: fresh KB starts with one rule", async () => {
    await expect(page.locator(".kb-count")).toContainText("1 rule aktif");
    await expect(page.locator(".correction-panel")).toHaveCount(0);
  });
  await shot("01-consultation-desktop.png");
  await check(
    "AC-02/04: default recommendation and correction panel",
    async () => {
      await fillCase("Formal");
      await expect(page.locator(".result-heading h2")).toHaveText("Casual");
      await page.getByRole("button", { name: "Koreksi", exact: true }).click();
      await expect(page.getByText("Cornerstone belum tersedia")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Simpan rule baru" }),
      ).toHaveCount(0);
      await page.getByRole("button", { name: "Tutup koreksi" }).click();
    },
  );
  await check("AC-03: approve baseline without creating rules", async () => {
    await fillCase();
    await page.getByRole("button", { name: "Setujui", exact: true }).click();
    expect((await saved()).rules.length).toBe(1);
    expect((await saved()).approvedCases.length).toBe(1);
  });
  await check("AC-06: reject condition matching cornerstone", async () => {
    await fillCase("Formal");
    await correct("Formal");
    await page
      .getByRole("combobox", { name: "Atribut", exact: true })
      .selectOption("location");
    await page.getByRole("button", { name: "Simpan rule baru" }).click();
    await expect(page.getByRole("alert")).toContainText("cornerstone");
    expect((await saved()).rules.length).toBe(1);
  });
  await check(
    "AC-05/07/14: save categorical exception and update recommendation",
    async () => {
      await page
        .getByRole("combobox", { name: "Atribut", exact: true })
        .selectOption("occasion");
      await page.getByRole("button", { name: "Simpan rule baru" }).click();
      await expect(page.locator(".result-heading h2")).toHaveText("Formal");
      expect((await saved()).rules[0].trueChildId).toBe("R1");
    },
  );
  await shot("02-recommendation-desktop.png");
  await check(
    "AC-09/12: numeric exception uses last matching conclusion",
    async () => {
      await fillCase("Formal", "33");
      await correct("Light Formal");
      await page.getByLabel("Nilai", { exact: true }).fill("30");
      await shot("03-correction-desktop.png");
      await page.getByRole("button", { name: "Simpan rule baru" }).click();
      await expect(page.locator(".result-heading h2")).toHaveText(
        "Light Formal",
      );
      expect((await saved()).rules[1].trueChildId).toBe("R2");
    },
  );
  await check("AC-08: false branch supports Semi-Formal", async () => {
    await fillCase("Semi-Formal");
    await correct("Smart Casual");
    await page.getByRole("button", { name: "Simpan rule baru" }).click();
    await expect(page.locator(".result-heading h2")).toHaveText("Smart Casual");
    expect((await saved()).rules[1].falseChildId).toBe("R3");
  });
  await check("AC-10: reload preserves four rules", async () => {
    await page.reload({ waitUntil: "networkidle" });
    expect((await saved()).rules.length).toBe(4);
    await expect(page.locator(".kb-count")).toContainText("4 rule aktif");
  });
  await check(
    "RDR: page opens with children and details collapsed",
    async () => {
      await page.getByRole("link", { name: "Eksplorasi RDR" }).click();
      await expect(page.locator(".tree-node")).toHaveCount(1);
      await expect(page.getByText("Kenali setiap rule.")).toBeVisible();
      await expect(page.locator(".lesson-list details[open]")).toHaveCount(0);
    },
  );
  await shot("04-rdr-collapsed-desktop.png");
  await check("RDR: manual branch expansion and rule details", async () => {
    await page
      .getByRole("button", { name: "Buka 1 cabang R0", exact: true })
      .click();
    await expect(page.locator(".tree-node")).toHaveCount(2);
    await page
      .getByRole("button", { name: "Buka 2 cabang R1", exact: true })
      .click();
    await expect(page.locator(".tree-node")).toHaveCount(4);
    await page.getByRole("button", { name: /^R3 / }).click();
    await expect(page.locator(".rule-properties")).toContainText(
      "FALSE · kiri",
    );
    await page.locator(".cornerstone-details summary").click();
  });
  await shot("05-rdr-full-tree-desktop.png");
  await check("RDR: demo mode leaves user KB untouched", async () => {
    const before = JSON.stringify(await saved());
    await page
      .getByRole("button", { name: "Contoh interaktif", exact: true })
      .click();
    await expect(page.locator(".tree-node")).toHaveCount(1);
    expect(JSON.stringify(await saved())).toBe(before);
  });
  await check(
    "RDR: simulation reveals one node per step, final Light Formal",
    async () => {
      await page.getByRole("button", { name: "Mulai penelusuran" }).click();
      await expect(page.locator(".trace-steps li")).toHaveCount(1);
      await page.getByRole("button", { name: "Langkah berikutnya" }).click();
      await expect(page.locator(".trace-steps li")).toHaveCount(2);
      await page.getByRole("button", { name: "Langkah berikutnya" }).click();
      await expect(page.locator(".trace-steps li")).toHaveCount(3);
      await expect(page.locator(".trace-conclusion strong")).toHaveText(
        "Light Formal",
      );
      await expect(
        page.getByRole("button", { name: "Penelusuran selesai" }),
      ).toBeDisabled();
    },
  );
  await page.getByRole("button", { name: "Buka semua", exact: true }).click();
  await page.locator(".cornerstone-details summary").click();
  await page.locator(".lesson-list summary").nth(0).click();
  await page.locator(".lesson-list summary").nth(1).click();
  await page.locator(".lesson-list summary").nth(2).click();
  await shot("06-rdr-complete-desktop.png");
  await page
    .locator(".rdr-workspace")
    .screenshot({ path: "qa/07-rdr-tree-detail.png", animations: "disabled" });
  await page
    .locator(".simulator")
    .screenshot({ path: "qa/08-rdr-traversal.png", animations: "disabled" });
  await page
    .locator(".learn-section")
    .screenshot({ path: "qa/09-rdr-explanation.png", animations: "disabled" });
  await check(
    "RDR: false traversal keeps previous result until R3 matches",
    async () => {
      await page.getByLabel("Kasus yang ditelusuri").selectOption("3");
      await page.getByRole("button", { name: "Mulai penelusuran" }).click();
      await page.getByRole("button", { name: "Langkah berikutnya" }).click();
      await expect(page.locator(".trace-conclusion strong")).toHaveText(
        "Casual",
      );
      await expect(page.locator(".trace-steps li").nth(1)).toContainText(
        "FALSE",
      );
      await page.getByRole("button", { name: "Langkah berikutnya" }).click();
      await expect(page.locator(".trace-conclusion strong")).toHaveText(
        "Smart Casual",
      );
    },
  );
  await check(
    "Responsive: no page-level horizontal overflow at 1440, 1024, 768, 390, 360px",
    async () => {
      for (const width of [1440, 1024, 768, 390, 360]) {
        await page.setViewportSize({ width, height: 1000 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
          `RDR overflow at ${width}`,
        ).toBe(true);
        await page
          .getByRole("link", { name: "Konsultasi", exact: true })
          .click();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
          `Consultation overflow at ${width}`,
        ).toBe(true);
        await page.getByRole("link", { name: "Eksplorasi RDR" }).click();
      }
    },
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("10-rdr-mobile.png");
  await page.getByRole("link", { name: "Konsultasi", exact: true }).click();
  await shot("11-consultation-mobile.png");
  await check(
    "Input validation: out of range temperature blocked",
    async () => {
      await page.getByLabel("Suhu udara").fill("46");
      await page.getByRole("button", { name: "Temukan outfit" }).click();
      expect(
        await page.getByLabel("Suhu udara").evaluate((el) => el.validity.valid),
      ).toBe(false);
    },
  );
  await check("AC-11: reset modal cancel, Escape, and confirm", async () => {
    await page.getByRole("button", { name: "Reset knowledge base" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect((await saved()).rules.length).toBe(4);
    await page.getByRole("button", { name: "Reset knowledge base" }).click();
    await page.getByRole("button", { name: "Ya, reset KB" }).click();
    expect((await saved()).rules.length).toBe(1);
    expect((await saved()).approvedCases.length).toBe(0);
  });
  await check("Corrupt LocalStorage recovers without crashing", async () => {
    await page.evaluate(() =>
      localStorage.setItem("fitcheck.rdr.v1", "{broken"),
    );
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator(".kb-count")).toContainText("1 rule aktif");
    await expect(page.getByRole("status")).toContainText("rusak");
  });
  // Collect WCAG 2.1 AA findings for each representative screen.
  await page.getByRole("button", { name: "Tutup notifikasi" }).click();
  await page.setViewportSize({ width: 1440, height: 1100 });
  const a11y = [];
  a11y.push({
    screen: "consultation",
    ...(await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze()),
  });
  await fillCase();
  await page.getByRole("button", { name: "Setujui", exact: true }).click();
  await fillCase("Formal");
  await correct("Formal");
  a11y.push({
    screen: "correction",
    ...(await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze()),
  });
  await page.getByRole("link", { name: "Eksplorasi RDR" }).click();
  await page
    .getByRole("button", { name: "Contoh interaktif", exact: true })
    .click();
  await page.getByRole("button", { name: "Buka semua", exact: true }).click();
  await page.getByRole("button", { name: /^R2 / }).click();
  await page.getByRole("button", { name: "Mulai penelusuran" }).click();
  a11y.push({
    screen: "rdr",
    ...(await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze()),
  });
  await writeFile(
    "qa/accessibility.json",
    JSON.stringify(
      a11y.map((r) => ({ screen: r.screen, violations: r.violations })),
      null,
      2,
    ),
  );
  for (const r of a11y) {
    console.log(
      "A11Y",
      r.screen,
      r.violations.map((v) => `${v.id} (${v.nodes.length})`).join(", ") ||
        "0 violations",
    );
  }
  await check(
    "WCAG 2.1 AA: zero automated violations on three screens",
    async () => {
      for (const r of a11y)
        expect(r.violations, `Accessibility violations on ${r.screen}`).toEqual(
          [],
        );
    },
  );
  await check("No browser console errors", async () =>
    expect(errors).toEqual([]),
  );
  await writeFile(
    "qa/browser-report.json",
    JSON.stringify(
      {
        date: "2026-11-03",
        base,
        results,
        consoleErrors: errors,
        accessibility: a11y.map((r) => ({
          screen: r.screen,
          violations: r.violations.length,
        })),
      },
      null,
      2,
    ),
  );
  console.log(`\n${results.length} browser checks passed. Screenshots in qa/.`);
} catch (error) {
  await shot("failure.png").catch(() => {});
  await writeFile(
    "qa/browser-report.json",
    JSON.stringify(
      { results, consoleErrors: errors, failure: error.message },
      null,
      2,
    ),
  );
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
