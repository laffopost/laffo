import logger from "./logger";
/**
 * Utility to compress images for LaughCoin
 * Aggressive compression for fast loading
 */

export const compressImage = (base64OrUrl, maxWidth = 550, quality = 0.55) => {
  return new Promise((resolve, _reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      // Smaller max width (550px instead of 600px)
      if (width > maxWidth) {
        height = (height / width) * maxWidth;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      try {
        // More aggressive compression (55% quality instead of 65%)
        const compressed = canvas.toDataURL("image/jpeg", quality);

        logger.log("🗜️ Original:", base64OrUrl.length, "bytes");
        logger.log("🗜️ Compressed:", compressed.length, "bytes");
        logger.log(
          "🗜️ Reduction:",
          Math.round((1 - compressed.length / base64OrUrl.length) * 100) + "%",
        );

        resolve({
          data: compressed,
          originalSize: base64OrUrl.length,
          compressedSize: compressed.length,
          reduction: Math.round(
            (1 - compressed.length / base64OrUrl.length) * 100,
          ),
        });
      } catch (error) {
        logger.warn("⚠️ CORS prevented compression:", error);
        resolve({
          data: base64OrUrl,
          originalSize: base64OrUrl.length,
          compressedSize: base64OrUrl.length,
          reduction: 0,
        });
      }
    };

    img.onerror = (err) => {
      logger.error("❌ Image load failed:", err);
      resolve({
        data: base64OrUrl,
        originalSize: base64OrUrl.length,
        compressedSize: base64OrUrl.length,
        reduction: 0,
      });
    };

    img.src = base64OrUrl;
  });
};

/**
 * Compress avatar images - more aggressive
 */
export const compressAvatar = (base64OrUrl) => {
  return new Promise((resolve, _reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");

      // Avatar max size: 140px (smaller)
      const maxSize = 140;
      let width = img.width;
      let height = img.height;

      const size = Math.min(width, height);
      const x = (width - size) / 2;
      const y = (height - size) / 2;

      const scale = Math.min(maxSize / size, 1);
      const targetSize = Math.floor(size * scale);

      canvas.width = targetSize;
      canvas.height = targetSize;

      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(img, x, y, size, size, 0, 0, targetSize, targetSize);

      try {
        // Aggressive for avatars (45% quality)
        const compressed = canvas.toDataURL("image/jpeg", 0.45);

        logger.log("🗜️ Avatar - Original:", base64OrUrl.length, "bytes");
        logger.log("🗜️ Avatar - Compressed:", compressed.length, "bytes");
        logger.log(
          "🗜️ Avatar - Reduction:",
          Math.round((1 - compressed.length / base64OrUrl.length) * 100) + "%",
        );

        resolve({
          data: compressed,
          originalSize: base64OrUrl.length,
          compressedSize: compressed.length,
          reduction: Math.round(
            (1 - compressed.length / base64OrUrl.length) * 100,
          ),
        });
      } catch (error) {
        logger.warn("⚠️ CORS prevented compression:", error);
        resolve({
          data: base64OrUrl,
          originalSize: base64OrUrl.length,
          compressedSize: base64OrUrl.length,
          reduction: 0,
        });
      }
    };

    img.onerror = (err) => {
      logger.error("❌ Avatar load failed:", err);
      resolve({
        data: base64OrUrl,
        originalSize: base64OrUrl.length,
        compressedSize: base64OrUrl.length,
        reduction: 0,
      });
    };

    img.src = base64OrUrl;
  });
};

export const compressionPresets = {
  avatar: { maxWidth: 140, quality: 0.45 }, // 45% - avatars (~4-6KB)
  gallery: { maxWidth: 550, quality: 0.55 }, // 55% - gallery (~25-40KB)
  highQuality: { maxWidth: 1000, quality: 0.75 }, // 75% - large displays
};
