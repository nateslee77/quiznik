export type MascotSkin = {
  id: string;
  name: string;
  price: number;
  gif: string;
};

// Hardcoded catalog, same lightweight pattern as the FEATURES/STEPS arrays
// used on the landing page. Add more by appending here and dropping a
// matching gif in public/ — "default" is always unlocked for everyone.
export const MASCOT_SKINS: MascotSkin[] = [
  { id: "default", name: "Classic", price: 0, gif: "/mascot%20dance.gif" },
  { id: "shop1", name: "Skin 1", price: 150, gif: "/mascot%20shop1.gif" },
  { id: "shop2", name: "Skin 2", price: 250, gif: "/mascot%20shop2.gif" },
  { id: "shop3", name: "Skin 3", price: 350, gif: "/mascot%20shop3.gif" },
  { id: "shop4", name: "Skin 4", price: 450, gif: "/mascot%20shop4.gif" },
];

export function findSkin(skinId: string): MascotSkin {
  return MASCOT_SKINS.find((s) => s.id === skinId) ?? MASCOT_SKINS[0];
}
