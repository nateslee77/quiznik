import { GearIcon } from "@/components/icons";
import { SoundSettings } from "@/components/SoundSettings";
import { PaletteSettings } from "@/components/PaletteSettings";
import { BackgroundSettings } from "@/components/BackgroundSettings";
import { MascotSettings } from "@/components/MascotSettings";

export default function SettingsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-8">
      <div className="mb-6 flex items-center gap-2">
        <GearIcon className="h-5 w-5 text-amber-950/60" />
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </div>

      <div className="flex flex-col gap-10">
        <section>
          <h2 className="mb-3 text-sm font-medium text-amber-950/50">Accent color</h2>
          <PaletteSettings />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-amber-950/50">Background</h2>
          <BackgroundSettings />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-amber-950/50">Mascot</h2>
          <MascotSettings />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-amber-950/50">Sound</h2>
          <SoundSettings />
        </section>
      </div>
    </main>
  );
}
