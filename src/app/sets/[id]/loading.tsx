import { LoadingScreen } from "@/components/LoadingScreen";

// Covers this deck page, and cascades as the fallback for /study, /test,
// and /learn under it too since they're nested segments.
export default function Loading() {
  return <LoadingScreen />;
}
