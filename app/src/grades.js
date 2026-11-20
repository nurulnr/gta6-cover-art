// Colour grades for the cover: each grade is a ramp the photo's brightness is
// mapped through (a gradient map), mixed back with the photo so the picture
// stays readable while the grade gives it the poster look. A ramp is stops of
// [position 0..1, red, green, blue]; `mix` is how much of the ramp shows
// (1 = the ramp alone), `frame` the neon line colour for the panel frames.

export const GRADES = {
  sunset: {
    label: 'Sunset',
    mix: 0.8,
    frame: '#ff2e88',
    stops: [
      [0.0, 26, 8, 46],
      [0.22, 122, 24, 96],
      [0.45, 214, 48, 96],
      [0.68, 255, 110, 52],
      [0.88, 255, 178, 72],
      [1.0, 255, 232, 170],
    ],
  },
  neon: {
    label: 'Neon',
    mix: 0.8,
    frame: '#22e6ff',
    stops: [
      [0.0, 6, 6, 34],
      [0.28, 74, 18, 150],
      [0.52, 214, 28, 178],
      [0.76, 56, 196, 240],
      [1.0, 224, 255, 255],
    ],
  },
  noir: {
    label: 'Noir',
    mix: 1.0,
    frame: '#ff2e2e',
    stops: [
      [0.0, 6, 6, 10],
      [0.5, 118, 118, 128],
      [1.0, 246, 246, 242],
    ],
  },
  gold: {
    label: 'Gold',
    mix: 0.8,
    frame: '#ffb52e',
    stops: [
      [0.0, 26, 13, 5],
      [0.38, 148, 88, 30],
      [0.68, 228, 168, 62],
      [1.0, 255, 236, 192],
    ],
  },
};

/** Builds a 256-entry lookup table for a grade: luminance 0..255 to [r, g, b]. */
export function gradeLut(grade) {
  const lut = new Uint8Array(256 * 3);
  const stops = grade.stops;
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0];
    let b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) {
        a = stops[s];
        b = stops[s + 1];
        break;
      }
    }
    const span = b[0] - a[0] || 1;
    const f = Math.min(1, Math.max(0, (t - a[0]) / span));
    lut[i * 3] = Math.round(a[1] + (b[1] - a[1]) * f);
    lut[i * 3 + 1] = Math.round(a[2] + (b[2] - a[2]) * f);
    lut[i * 3 + 2] = Math.round(a[3] + (b[3] - a[3]) * f);
  }
  return lut;
}

/**
 * Maps an ImageData's pixels through a grade's lookup table, mixed with the
 * original pixels by grade.mix. Runs in place and returns the same ImageData.
 */
export function applyGrade(imageData, lut, mix) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
    const j = lum * 3;
    d[i] = Math.round(d[i] * (1 - mix) + lut[j] * mix);
    d[i + 1] = Math.round(d[i + 1] * (1 - mix) + lut[j + 1] * mix);
    d[i + 2] = Math.round(d[i + 2] * (1 - mix) + lut[j + 2] * mix);
  }
  return imageData;
}
