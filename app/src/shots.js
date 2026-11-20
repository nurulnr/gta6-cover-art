// Fixed scenes for screenshots and shares: the ?shot= query picks a scene
// and its settings, so a plain link renders the same cover every time.
//   ?shot=editor  the editor with a sample photo loaded
//   ?shot=cover   the cover alone, full-screen, no editor chrome
// Settings: photo (a sample name), caption, subtitle, layout, grade, size.
// window.__shotReady is set once the scene has painted, for screenshot tools.

/** The shot settings from a URL query, with the defaults filled in. */
export function shotSettings(query) {
  return {
    shot: query.get('shot') ?? '',
    photo: query.get('photo') ?? 'pier',
    caption: query.get('caption') ?? 'VICE CITY',
    subtitle: query.get('subtitle') ?? 'Sunset Heist',
    layout: query.get('layout') ?? 'grid',
    grade: query.get('grade') ?? 'sunset',
    size: query.get('size') ?? 'landscape',
  };
}

/** Marks the scene painted, after two frames so the canvas has drawn. */
export function markShotReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
