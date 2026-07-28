import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Hero } from "@/components/landing/Hero";
import { FeatureCards } from "@/components/landing/FeatureCards";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Faq } from "@/components/landing/Faq";
import { ClosingCta } from "@/components/landing/ClosingCta";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/home");
  }

  return (
    <div className="flex flex-1 flex-col">
      <Hero />
      <FeatureCards />
      <HowItWorks />
      <Faq />
      <ClosingCta />
      <LandingFooter />
    </div>
  );
}
