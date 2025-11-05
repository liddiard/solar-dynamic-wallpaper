import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import { exec as execCallback } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execCallback);

interface SolarConfigEntry {
  fileName: string;
  altitude: number;
  azimuth: number;
  isPrimary?: boolean;
}

// Map from animation percentage to sun altitude.
// Screenshots will be taken at the specified animation percentages.
// The screenshot that will be displayed at any given time is the one with the
// altitude value closest to the sun's current altitude.
const animPctToSunAlt: Record<string, number> = {
  0: -20,
  2.5: -14,
  5: -9,
  7.5: -3.5,
  10: 0,
  15: 5,
  20: 15,
  35: 30,
  50: 45,
  65: 30,
  80: 15,
  85: 5,
  90: 0,
  92.5: -3.5,
  95: -9,
  97.5: -14,
  100: -20,
};

const baseDir = "images";

const getFileName = (animPct: number) => `sky-${animPct}.png`;

test("generate wallpapers", async ({ page }) => {
  await page.goto("/");
  const animPcts = Object.keys(animPctToSunAlt)
    .map(Number)
    .toSorted((a, b) => a - b);
  for (const animPct of animPcts) {
    await page.evaluate((animPct) => window.setAnimPct(animPct), animPct);
    await page.waitForTimeout(500);
    const fileName = getFileName(animPct);
    await page.screenshot({
      path: `${baseDir}/${fileName}`,
      fullPage: true,
    });
    console.log(`Saved ${fileName}`);
  }
});

test.afterAll(async () => {
  // Generate the image metadata for at what altitude to apply each wallpaper
  // https://github.com/mczachurski/wallpapper?tab=readme-ov-file#solar
  const solarConfig: SolarConfigEntry[] = Object.entries(animPctToSunAlt)
    .toSorted(([pctA], [pctB]) => Number(pctA) - Number(pctB))
    .map(([pct, altitude]) => ({
      fileName: getFileName(Number(pct)),
      altitude,
      azimuth: Number(pct) > 50 ? 270 : 90,
    }));
  solarConfig[0].isPrimary = true;
  await fs.writeFile(
    `${baseDir}/config.json`,
    JSON.stringify(solarConfig, null, 2)
  );
  console.log("Saved config.json");

  // Create the dynamic wallpaper
  const fileName = "sky_dynamic.heic";
  const { stdout, stderr } = await exec(
    `wallpapper -i config.json && mv output.heic ${fileName}`,
    {
      cwd: baseDir,
    }
  );
  if (stderr) {
    console.error(stderr);
  } else {
    console.log(stdout);
    console.log("✅ Generated dynamic wallpaper!");
    console.log(`🌅 Saved to file: ${baseDir}/${fileName}`);
  }
});
