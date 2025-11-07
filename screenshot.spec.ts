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
  5: -8,
  7.5: -2,
  10: 2,
  15: 7.5,
  20: 15,
  35: 30,
  50: 45,
  65: 30,
  80: 15,
  85: 7.5,
  90: 2,
  92.5: -2,
  95: -8,
  97.5: -14,
  100: -20,
};

const baseDir = "images";

const getSkyFileName = (animPct: number) => `sky-${animPct}.png`;
const getStarsFileName = (animPct: number) => `stars-${animPct}.png`;

test("generate wallpapers", async ({ page }) => {
  await page.goto("/");
  const animPcts = Object.keys(animPctToSunAlt)
    .map(Number)
    .toSorted((a, b) => a - b);
  for (const animPct of animPcts) {
    await page.evaluate((animPct) => window.setAnimPct(animPct), animPct);
    await page.waitForTimeout(500);
    let fileName = getSkyFileName(animPct);
    await page.locator("#sky").screenshot({
      path: `${baseDir}/${fileName}`,
    });
    console.log(`Saved ${fileName}`);
    fileName = getStarsFileName(animPct);
    await page.locator("#stars").screenshot({
      path: `${baseDir}/${fileName}`,
    });
    console.log(`Saved ${fileName}`);
  }
});

test.afterAll(async () => {
  const animPcts = Object.keys(animPctToSunAlt)
    .map(Number)
    .toSorted((a, b) => a - b);

  // Generate the image metadata for at what altitude to apply each wallpaper
  // https://github.com/mczachurski/wallpapper?tab=readme-ov-file#solar
  const solarConfig: SolarConfigEntry[] = animPcts.map((pct) => ({
    fileName: getSkyFileName(Number(pct)),
    altitude: animPctToSunAlt[pct],
    azimuth: Number(pct) > 50 ? 270 : 90,
  }));
  solarConfig[0].isPrimary = true;
  await fs.writeFile(
    `${baseDir}/config.json`,
    JSON.stringify(solarConfig, null, 2)
  );
  console.log("Saved config.json");

  // Process and composite the sky and stars images
  for (const animPct of animPcts) {
    const skyFileName = getSkyFileName(animPct);
    const starsFileName = getStarsFileName(animPct);
    console.log(`Processing ${skyFileName}`);
    const { stderr } = await exec(
      `magick ${skyFileName} -spread 32 ${skyFileName} && 
       magick ${skyFileName} ${starsFileName} -compose lighten -composite ${skyFileName}`,
      {
        cwd: baseDir,
      }
    );
    if (stderr) {
      console.error(stderr);
    } else {
      console.log(`Processed ${skyFileName}`);
    }
  }

  console.log('Cleaning up temporary "stars-*" files...');
  await exec("rm stars-*.png", { cwd: baseDir });

  // Create the dynamic wallpaper
  const fileName = "sky_dynamic.heic";
  console.log(`Generating dynamic wallpaper...`);
  const { stdout, stderr } = await exec(
    "wallpapper -i config.json && mv output.heic sky_dynamic.heic",
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
