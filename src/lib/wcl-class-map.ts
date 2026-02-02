/**
 * Warcraft Logs Class ID to Class Name Mapping
 * 
 * NOTE: WCL uses ALPHABETICAL ordering, NOT Blizzard's standard class ordering!
 * This was verified by testing with actual WCL API responses.
 * 
 * Example: ClassID 2 = Druid (alphabetically second after Death Knight)
 *          NOT Paladin (which is Blizzard's ID 2)
 */
export const WCL_CLASS_ID_TO_NAME = {
  1: "Death Knight",
  2: "Druid",
  3: "Hunter",
  4: "Mage",
  5: "Monk",
  6: "Paladin",
  7: "Priest",
  8: "Rogue",
  9: "Shaman",
  10: "Warlock",
  11: "Warrior",
  12: "Demon Hunter",
  13: "Evoker",
} as const

export type WCLClassID = keyof typeof WCL_CLASS_ID_TO_NAME
export type WCLClassName = typeof WCL_CLASS_ID_TO_NAME[WCLClassID]

/**
 * Convert WCL classID to human-readable class name
 */
export function getWCLClassName(classID: number): string {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[WCL Class Map] ClassID: ${classID} -> ${WCL_CLASS_ID_TO_NAME[classID as WCLClassID] || 'Unknown'}`)
  }
  return WCL_CLASS_ID_TO_NAME[classID as WCLClassID] || 'Unknown'
}
