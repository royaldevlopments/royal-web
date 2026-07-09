import Header from '@/components/Header';
import Hero from '@/components/Hero';
import DomainSearch from '@/components/DomainSearch';
import GameServers from '@/components/GameServers';
import Features from '@/components/Features';
import TechStack from '@/components/TechStack';
import AboutSection from '@/components/AboutSection';
import Announcements from '@/components/Announcements';
import AffiliateCTA from '@/components/AffiliateCTA';
import Partners from '@/components/Partners';
import SpeedBenchmark from '@/components/SpeedBenchmark';
import SupportStatus from '@/components/SupportStatus';
import DataCenters from '@/components/DataCenters';
import FAQ from '@/components/FAQ';
import BeyondGaming from '@/components/BeyondGaming';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Announcements />
        <Hero />
        <DomainSearch />
        <GameServers />
        <Features />
        <TechStack />
        <AboutSection />
        <AffiliateCTA />
        <Partners />
        <SpeedBenchmark />
        <SupportStatus />
        <DataCenters />
        <FAQ />
      </main>
      <BeyondGaming />
      <Footer />
    </div>
  );
};

export default Index;
