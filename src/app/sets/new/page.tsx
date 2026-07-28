import { NewSetForm } from "@/components/NewSetForm";

export default function NewSetPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Create a new set</h1>
      <NewSetForm />
    </main>
  );
}
