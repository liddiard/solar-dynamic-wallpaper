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

// Take screenshots at these percentages of the animation
const animPcts = [
  0, 2.5, 5, 7.5, 10, 15, 20, 35, 50, 65, 80, 85, 90, 92.5, 95, 97.5, 100,
];

// Override the sun altitude calculation for these animation percentages
// For example, by default 50% would correspond to 90 degrees (sun directly overhead)
// In reality, the sun is rarely directly overhead, so I've reduced this to 60 degrees.
// This means the 50% animation screenshot will be applied when the sun's altitude is
// 60 degrees or higher.
// The "right" way to do this would be with some trigonometry, but right now I don't
// care to be that precise. :)
const customAlts: Record<number, number> = {
  35: 30,
  50: 60,
  65: 30,
};

const baseDir = "images";

const getFileName = (animPct: number) => `sky-${animPct}.png`;

// Convert sky animation percentage [0..100] to a sun altitude [-90..+90]
function animPctToSunAlt(pct: number) {
  // if this sun is below this altitude, consider the sky fully dark (0% or 100%)
  // animation
  const nightAlt = -20;
  const altRange = 90 + Math.abs(nightAlt); // 110 total degrees (-20 → +90)
  const isRising = pct < 50;

  if (isRising) {
    // inverse of pct = ((altitude + 20) / 110) * 50
    return (pct / 50) * altRange + nightAlt;
  } else {
    // inverse of pct = (50 - ((altitude + 20)/110)*50) + 50
    return ((100 - pct) / 50) * altRange + nightAlt;
  }
}

test("generate wallpapers", async ({ page }) => {
  await page.goto("/");
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
  const solarConfig: SolarConfigEntry[] = animPcts.map((pct) => ({
    fileName: getFileName(pct),
    altitude: customAlts[pct] ?? animPctToSunAlt(pct),
    azimuth: pct > 50 ? 270 : 90,
  }));
  solarConfig[0].isPrimary = true;
  await fs.writeFile(
    `${baseDir}/config.json`,
    JSON.stringify(solarConfig, null, 2)
  );
  console.log("Saved config.json");

  // Create the dynamic wallpaper
  const { stdout, stderr } = await exec("wallpapper -i config.json", {
    cwd: baseDir,
  });
  if (stderr) {
    console.error(stderr);
  } else {
    console.log(stdout);
    console.log("✅ Generated dynamic wallpaper!");
    console.log(`🌅 Saved to file: ${baseDir}/output.heic`);
  }
});
