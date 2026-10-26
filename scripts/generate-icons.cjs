// Package the supplied artwork for Expo without cropping or stretching it.
const fs = require("node:fs/promises");
const path = require("node:path");
const Jimp = require("jimp-compact");

const imageDirectory = path.join(__dirname, "..", "assets", "images");
const sourcePath = path.join(imageDirectory, "Glossy Neon M Wave Emblem.png");

async function generateIcons() {
  const source = await Jimp.read(sourcePath);
  const variants = [
    { name: "icon.png", size: 1024, artworkSize: 820, background: 0x000000ff },
    // Keep the complete emblem inside Android's adaptive icon safe area.
    { name: "adaptive-icon.png", size: 1024, artworkSize: 600, background: 0x00000000 },
    { name: "splash-icon.png", size: 1024, artworkSize: 900, background: 0x00000000 },
    { name: "favicon.png", size: 64, artworkSize: 60, background: 0x00000000 },
  ];

  for (const { name, size, artworkSize, background } of variants) {
    const artwork = source.clone().scaleToFit(artworkSize, artworkSize);
    const canvas = new Jimp(size, size, background);
    canvas.composite(
      artwork,
      Math.round((size - artwork.bitmap.width) / 2),
      Math.round((size - artwork.bitmap.height) / 2)
    );
    await canvas.writeAsync(path.join(imageDirectory, name));
    console.log(`Updated ${name} (${size} x ${size})`);
  }

  // This unused legacy asset contained the previous app logo.
  await fs.rm(path.join(imageDirectory, "placeholder.png"), { force: true });
}

generateIcons().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
