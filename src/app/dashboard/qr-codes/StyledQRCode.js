"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

const STYLES = {
  classic: { moduleRadius: 0, finderRadius: 0 },
  rounded: { moduleRadius: 0.4, finderRadius: 0.3 },
  thin: { moduleRadius: 0, finderRadius: 0, moduleScale: 0.7 },
  smooth: { moduleRadius: 0.5, finderRadius: 0.5 },
  circles: { moduleRadius: 0.5, finderRadius: 0.5, isCircle: true },
};

function drawRoundedRect(ctx, x, y, w, h, r) {
  if (r === 0) {
    ctx.rect(x, y, w, h);
    return;
  }
  const radius = Math.min(r * w, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawCircle(ctx, cx, cy, r) {
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
}

function isFinderPattern(row, col, moduleCount) {
  if (row < 7 && col < 7) return true;
  if (row < 7 && col >= moduleCount - 7) return true;
  if (row >= moduleCount - 7 && col < 7) return true;
  return false;
}

function drawFinderPattern(ctx, x, y, size, radius, squaresColor, pixelsColor, bgColor) {
  const unit = size / 7;

  ctx.fillStyle = squaresColor;
  ctx.beginPath();
  drawRoundedRect(ctx, x, y, size, size, radius);
  ctx.fill();

  ctx.fillStyle = bgColor;
  ctx.beginPath();
  drawRoundedRect(ctx, x + unit, y + unit, unit * 5, unit * 5, radius * 0.8);
  ctx.fill();

  ctx.fillStyle = pixelsColor;
  ctx.beginPath();
  drawRoundedRect(ctx, x + unit * 2, y + unit * 2, unit * 3, unit * 3, radius * 0.6);
  ctx.fill();
}

// SVG path helpers
function svgRoundedRect(x, y, w, h, r) {
  if (r === 0) {
    return `M${x},${y}h${w}v${h}h${-w}Z`;
  }
  const radius = Math.min(r * w, w / 2, h / 2);
  return `M${x + radius},${y}
    h${w - 2 * radius}
    q${radius},0 ${radius},${radius}
    v${h - 2 * radius}
    q0,${radius} ${-radius},${radius}
    h${-(w - 2 * radius)}
    q${-radius},0 ${-radius},${-radius}
    v${-(h - 2 * radius)}
    q0,${-radius} ${radius},${-radius}Z`.replace(/\s+/g, " ");
}

function svgCircle(cx, cy, r) {
  return `M${cx - r},${cy}a${r},${r} 0 1,0 ${r * 2},0a${r},${r} 0 1,0 ${-r * 2},0`;
}

function svgFinderPattern(x, y, size, radius, squaresColor, pixelsColor, bgColor) {
  const unit = size / 7;
  let paths = "";

  // Outer
  paths += `<path d="${svgRoundedRect(x, y, size, size, radius)}" fill="${squaresColor}"/>`;
  // Middle (background)
  paths += `<path d="${svgRoundedRect(x + unit, y + unit, unit * 5, unit * 5, radius * 0.8)}" fill="${bgColor}"/>`;
  // Inner
  paths += `<path d="${svgRoundedRect(x + unit * 2, y + unit * 2, unit * 3, unit * 3, radius * 0.6)}" fill="${pixelsColor}"/>`;

  return paths;
}

// Export function to generate SVG string
export function generateQRCodeSVG({
  value,
  size = 180,
  bgColor = "#ffffff",
  squaresColor = "#000000",
  pixelsColor = "#000000",
  style = "classic",
  pattern = "solid",
}) {
  if (!value) return null;

  const styleConfig = STYLES[style] || STYLES.classic;

  try {
    const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
    const modules = qr.modules;
    const moduleCount = modules.size;
    const margin = 2;
    const totalSize = moduleCount + margin * 2;
    const moduleSize = size / totalSize;
    const offset = margin * moduleSize;

    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<rect width="${size}" height="${size}" fill="${bgColor}"/>`;

    // Finder patterns
    const finderSize = moduleSize * 7;
    svgContent += svgFinderPattern(offset, offset, finderSize, styleConfig.finderRadius, squaresColor, pixelsColor, bgColor);
    svgContent += svgFinderPattern(offset + (moduleCount - 7) * moduleSize, offset, finderSize, styleConfig.finderRadius, squaresColor, pixelsColor, bgColor);
    svgContent += svgFinderPattern(offset, offset + (moduleCount - 7) * moduleSize, finderSize, styleConfig.finderRadius, squaresColor, pixelsColor, bgColor);

    // Data modules - group by color for efficiency
    const moduleScale = styleConfig.moduleScale || 1;
    const scaledSize = moduleSize * moduleScale;
    const moduleOffset = (moduleSize - scaledSize) / 2;

    const pathsByColor = {};

    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (isFinderPattern(row, col, moduleCount)) continue;
        if (!modules.get(row, col)) continue;

        const x = offset + col * moduleSize + moduleOffset;
        const y = offset + row * moduleSize + moduleOffset;

        let fillColor = pixelsColor;
        if (pattern === "checkered" && (row + col) % 2 === 0) {
          fillColor = squaresColor;
        } else if (pattern === "horizontal" && row % 2 === 0) {
          fillColor = squaresColor;
        } else if (pattern === "vertical" && col % 2 === 0) {
          fillColor = squaresColor;
        }

        if (!pathsByColor[fillColor]) pathsByColor[fillColor] = "";

        if (styleConfig.isCircle) {
          pathsByColor[fillColor] += svgCircle(x + scaledSize / 2, y + scaledSize / 2, scaledSize / 2);
        } else {
          pathsByColor[fillColor] += svgRoundedRect(x, y, scaledSize, scaledSize, styleConfig.moduleRadius);
        }
      }
    }

    for (const [color, pathData] of Object.entries(pathsByColor)) {
      svgContent += `<path d="${pathData}" fill="${color}"/>`;
    }

    svgContent += "</svg>";
    return svgContent;
  } catch {
    return null;
  }
}

export default function StyledQRCode({
  value,
  size = 180,
  bgColor = "#ffffff",
  squaresColor = "#000000",
  pixelsColor = "#000000",
  style = "classic",
  pattern = "solid",
}) {
  const canvasRef = useRef(null);
  const styleConfig = STYLES[style] || STYLES.classic;

  useEffect(() => {
    if (!value || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const scale = 4;
    canvas.width = size * scale;
    canvas.height = size * scale;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(scale, scale);

    try {
      const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
      const modules = qr.modules;
      const moduleCount = modules.size;
      const margin = 2;
      const totalSize = moduleCount + margin * 2;
      const moduleSize = size / totalSize;
      const offset = margin * moduleSize;

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, size, size);

      const finderSize = moduleSize * 7;
      drawFinderPattern(ctx, offset, offset, finderSize, styleConfig.finderRadius, squaresColor, pixelsColor, bgColor);
      drawFinderPattern(ctx, offset + (moduleCount - 7) * moduleSize, offset, finderSize, styleConfig.finderRadius, squaresColor, pixelsColor, bgColor);
      drawFinderPattern(ctx, offset, offset + (moduleCount - 7) * moduleSize, finderSize, styleConfig.finderRadius, squaresColor, pixelsColor, bgColor);

      const moduleScale = styleConfig.moduleScale || 1;
      const scaledSize = moduleSize * moduleScale;
      const moduleOffset = (moduleSize - scaledSize) / 2;

      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (isFinderPattern(row, col, moduleCount)) continue;
          if (!modules.get(row, col)) continue;

          const x = offset + col * moduleSize + moduleOffset;
          const y = offset + row * moduleSize + moduleOffset;

          let fillColor = pixelsColor;
          if (pattern === "checkered" && (row + col) % 2 === 0) {
            fillColor = squaresColor;
          } else if (pattern === "horizontal" && row % 2 === 0) {
            fillColor = squaresColor;
          } else if (pattern === "vertical" && col % 2 === 0) {
            fillColor = squaresColor;
          }

          ctx.fillStyle = fillColor;
          ctx.beginPath();

          if (styleConfig.isCircle) {
            drawCircle(ctx, x + scaledSize / 2, y + scaledSize / 2, scaledSize / 2);
          } else {
            drawRoundedRect(ctx, x, y, scaledSize, scaledSize, styleConfig.moduleRadius);
          }
          ctx.fill();
        }
      }
    } catch {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, size, size);
    }
  }, [value, size, bgColor, squaresColor, pixelsColor, style, pattern, styleConfig]);

  return <canvas ref={canvasRef} />;
}
