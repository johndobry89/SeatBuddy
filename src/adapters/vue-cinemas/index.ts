// G0 has not been performed. No origins, selectors, content scripts or live actions are enabled.
export function liveDetection(): { status: 'UNKNOWN'; reason: string } {
  return {
    status: 'UNKNOWN',
    reason:
      'Live Vue-detectie is uitgeschakeld tot afzonderlijk G0-bewijs beschikbaar is.',
  };
}
