import { MascotPlaceholder } from "@/components/landing/MascotPlaceholder";
import { SparkleIcon } from "@/components/icons";

// Placeholder storefront — cosmetics unlock/purchase mechanics arrive with
// the XP/streak system. Items here are display-only.
const ITEMS = [
  { name: "Party hat", description: "For celebration screens", price: 150 },
  { name: "Round glasses", description: "Extra studious energy", price: 100 },
  { name: "Cozy scarf", description: "Winter study sessions", price: 120 },
  { name: "Crown", description: "For true deck masters", price: 500 },
  { name: "Rose theme", description: "Alternate accent color", price: 300 },
  { name: "Streak freeze", description: "Protects a missed day", price: 200 },
];

export default function ShopPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-8">
      <div className="mb-2 flex items-center gap-3">
        <MascotPlaceholder variant="celebrate" className="h-12 w-12" />
        <h1 className="text-2xl font-semibold tracking-tight">Shop</h1>
      </div>
      <p className="mb-8 text-sm text-amber-950/50">
        Dress up your study buddy. Coins and unlocks are coming with streaks &amp; XP — browse for
        now!
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ITEMS.map((item) => (
          <div
            key={item.name}
            className="relative flex flex-col items-center gap-2 rounded-2xl border border-amber-900/10 bg-white p-5 text-center"
          >
            <span className="absolute right-3 top-3 rounded-full bg-orange-100/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-950/50">
              Soon
            </span>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-500">
              <SparkleIcon className="h-6 w-6" />
            </span>
            <p className="text-sm font-semibold">{item.name}</p>
            <p className="text-xs text-amber-950/50">{item.description}</p>
            <p className="mt-1 rounded-full bg-amber-200/70 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              {item.price} coins
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
