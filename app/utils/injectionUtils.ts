export function getOppositeSite(site: string): string {
  const oppositePairs: Record<string, string> = {
    'Left Glute': 'Right Glute',
    'Right Glute': 'Left Glute',
    'Left Delt': 'Right Delt',
    'Right Delt': 'Left Delt',
    'Left Thigh': 'Right Thigh',
    'Right Thigh': 'Left Thigh',
    'Left Arm': 'Right Arm',
    'Right Arm': 'Left Arm',
    'Abdomen': 'Abdomen'
  };
  return oppositePairs[site] || site;
} 