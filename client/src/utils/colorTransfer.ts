export interface ImageStats {
  mean: [number, number, number];
  std: [number, number, number];
}

export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  // Normalize RGB to [0, 1]
  let rNormal = r / 255;
  let gNormal = g / 255;
  let bNormal = b / 255;

  // Gamma correction
  rNormal = rNormal > 0.04045 ? Math.pow((rNormal + 0.055) / 1.055, 2.4) : rNormal / 12.92;
  gNormal = gNormal > 0.04045 ? Math.pow((gNormal + 0.055) / 1.055, 2.4) : gNormal / 12.92;
  bNormal = bNormal > 0.04045 ? Math.pow((bNormal + 0.055) / 1.055, 2.4) : bNormal / 12.92;

  // sRGB to XYZ conversion using D65 white point
  let x = rNormal * 0.4124 + gNormal * 0.3576 + bNormal * 0.1805;
  let y = rNormal * 0.2126 + gNormal * 0.7152 + bNormal * 0.0722;
  let z = rNormal * 0.0193 + gNormal * 0.1192 + bNormal * 0.9505;

  // Normalize for D65 white point: Xn=0.950489, Yn=1.0, Zn=1.088840
  x /= 0.950489;
  y /= 1.00000;
  z /= 1.08884;

  // XYZ to LAB
  const fX = x > 0.008856 ? Math.pow(x, 1/3) : 7.787 * x + 16/116;
  const fY = y > 0.008856 ? Math.pow(y, 1/3) : 7.787 * y + 16/116;
  const fZ = z > 0.008856 ? Math.pow(z, 1/3) : 7.787 * z + 16/116;

  const l = 116 * fY - 16;
  const a = 500 * (fX - fY);
  const bVal = 200 * (fY - fZ);

  return [l, a, bVal];
}

export function labToRgb(l: number, a: number, b: number): [number, number, number] {
  // LAB to XYZ
  const fY = (l + 16) / 116;
  const fX = fY + a / 500;
  const fZ = fY - b / 200;

  const xY = Math.pow(fY, 3);
  const xX = Math.pow(fX, 3);
  const xZ = Math.pow(fZ, 3);

  const y = xY > 0.008856 ? xY : (fY - 16/116) / 7.787;
  const x = xX > 0.008856 ? xX : (fX - 16/116) / 7.787;
  const z = xZ > 0.008856 ? xZ : (fZ - 16/116) / 7.787;

  // D65 reference white point
  let X = x * 0.950489;
  let Y = y * 1.00000;
  let Z = z * 1.08884;

  // XYZ to RGB
  let r = X * 3.2406 + Y * -1.5372 + Z * -0.4986;
  let g = X * -0.9689 + Y * 1.8758 + Z * 0.0415;
  let bVal = X * 0.0557 + Y * -0.2040 + Z * 1.0570;

  // Inverse gamma correction
  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1/2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1/2.4) - 0.055 : 12.92 * g;
  bVal = bVal > 0.0031308 ? 1.055 * Math.pow(bVal, 1/2.4) - 0.055 : 12.92 * bVal;

  // Clamp and scale to [0, 255]
  const R = Math.max(0, Math.min(255, Math.round(r * 255)));
  const G = Math.max(0, Math.min(255, Math.round(g * 255)));
  const B = Math.max(0, Math.min(255, Math.round(bVal * 255)));

  return [R, G, B];
}

export function calculateStats(pixels: Uint8ClampedArray, stride: number = 8): ImageStats {
  let sumL = 0, sumA = 0, sumB = 0;
  let count = 0;

  const len = pixels.length;
  // First pass: calculate mean
  for (let i = 0; i < len; i += 4 * stride) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const [l, a, bVal] = rgbToLab(r, g, b);
    sumL += l;
    sumA += a;
    sumB += bVal;
    count++;
  }

  const meanL = sumL / count;
  const meanA = sumA / count;
  const meanB = sumB / count;

  // Second pass: calculate standard deviation
  let sqSumL = 0, sqSumA = 0, sqSumB = 0;
  for (let i = 0; i < len; i += 4 * stride) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const [l, a, bVal] = rgbToLab(r, g, b);
    sqSumL += Math.pow(l - meanL, 2);
    sqSumA += Math.pow(a - meanA, 2);
    sqSumB += Math.pow(bVal - meanB, 2);
  }

  // Avoid division by zero
  const stdL = Math.sqrt(sqSumL / count) || 0.0001;
  const stdA = Math.sqrt(sqSumA / count) || 0.0001;
  const stdB = Math.sqrt(sqSumB / count) || 0.0001;

  return {
    mean: [meanL, meanA, meanB],
    std: [stdL, stdA, stdB]
  };
}

export function applyColorTransfer(
  sourceData: ImageData,
  targetStats: ImageStats
): void {
  const pixels = sourceData.data;
  const len = pixels.length;

  // Calculate source stats first (use stride 8 for fast performance)
  const sourceStats = calculateStats(pixels, 8);

  const stdLRatio = targetStats.std[0] / sourceStats.std[0];
  const stdARatio = targetStats.std[1] / sourceStats.std[1];
  const stdBRatio = targetStats.std[2] / sourceStats.std[2];

  const sourceMeanL = sourceStats.mean[0];
  const sourceMeanA = sourceStats.mean[1];
  const sourceMeanB = sourceStats.mean[2];

  const targetMeanL = targetStats.mean[0];
  const targetMeanA = targetStats.mean[1];
  const targetMeanB = targetStats.mean[2];

  // Process all pixels
  for (let i = 0; i < len; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    const [l, a, bVal] = rgbToLab(r, g, b);

    // Scale and shift in LAB space
    const newL = (l - sourceMeanL) * stdLRatio + targetMeanL;
    const newA = (a - sourceMeanA) * stdARatio + targetMeanA;
    const newB = (b - sourceMeanB) * stdBRatio + targetMeanB;

    const [newR, newG, newBVal] = labToRgb(newL, newA, newB);

    pixels[i] = newR;
    pixels[i + 1] = newG;
    pixels[i + 2] = newBVal;
  }
}
