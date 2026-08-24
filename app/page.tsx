import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Planner from "@/components/Planner";
import HowItWorks from "@/components/HowItWorks";
import WhyDrivePlanner from "@/components/WhyDrivePlanner";
import Features from "@/components/Features";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <Planner />
      <HowItWorks />
      <WhyDrivePlanner />
      <Features />
      <FinalCTA />
      <Footer />
    </main>
  );
}
