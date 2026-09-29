// Pupils who have left a class after its roster was first seeded. Hand-maintained
// (unlike the auto-generated ROSTERS): when a name is deleted from
// docs/References/namelist.xlsx, add it here too so syncRoster removes the pupil
// from data already saved locally and in Firestore. Keyed by class name.
export const WITHDRAWN: Record<string, string[]> = {
  "2D": ["NG MING LIANG"],
};
