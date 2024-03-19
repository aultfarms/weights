export function firstSourceName(sourcestr: string): string {
  return sourcestr.split(',').map(s => s.trim())?.[0] || '';
}

export function matchFullSourceFromPart(part: string, sources: string[]): string {
  return sources.find(s => s.indexOf(part) >= 0) || '';
}

export function allSourcesFromFullSource(full: string): string[] {
  return full.split(',').map(s => s.trim());
}

export const newLoadString = '--- New Load Number ---';