import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import MinecraftPlans from "./pages/MinecraftPlans";
import HytalePlans from "./pages/HytalePlans";
import PalworldPlans from "./pages/PalworldPlans";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import RefundPolicy from "./pages/RefundPolicy";
import Contact from "./pages/Contact";
import TermsOfService from "./pages/TermsOfService";
import About from "./pages/About";
import Tutorials from "./pages/Tutorials";
import DiscordBotHosting from "./pages/DiscordBotHosting";
import WebHosting from "./pages/WebHosting";
import FAQPage from "./pages/FAQ";
import IntelPlatinumVPS from "./pages/IntelPlatinumVPS";
import IntelXeonVPS from "./pages/IntelXeonVPS";
import AMDRyzenVPS from "./pages/AMDRyzenVPS";
import AMDEpycVPS from "./pages/AMDEpycVPS";
import RDPPlans from "./pages/RDPPlans";
import AllGames from "./pages/AllGames";
import EnshroudedPlans from "./pages/EnshroudedPlans";
import ProjectZomboidPlans from "./pages/ProjectZomboidPlans";
import TerrariaPlans from "./pages/TerrariaPlans";
import ValheimPlans from "./pages/ValheimPlans";
import SevenDaysToDiePlans from "./pages/SevenDaysToDiePlans";
import ArkSurvivalPlans from "./pages/ArkSurvivalPlans";
import SatisfactoryPlans from "./pages/SatisfactoryPlans";
import Arma3Plans from "./pages/Arma3Plans";
import EmailHosting from "./pages/EmailHosting";
import CloudStoragePlans from "./pages/CloudStoragePlans";
import DomainSearchPage from "./pages/DomainSearchPage";
import Downloads from "./pages/Downloads";
import NotFound from "./pages/NotFound";
import ChatWidget from "./components/ChatWidget";
import AnimatedBackground from "./components/AnimatedBackground";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AnimatedBackground />
      <ChatWidget />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/games/minecraft" element={<MinecraftPlans />} />
          <Route path="/games/hytale" element={<HytalePlans />} />
          <Route path="/games/palworld" element={<PalworldPlans />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/about" element={<About />} />
          <Route path="/tutorials" element={<Tutorials />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/services/discord-bot" element={<DiscordBotHosting />} />
          <Route path="/services/web-hosting" element={<WebHosting />} />
          <Route path="/services/rdp" element={<RDPPlans />} />
          <Route path="/services/email-hosting" element={<EmailHosting />} />
          <Route path="/services/domains" element={<DomainSearchPage />} />
          <Route path="/services/cloud-storage" element={<CloudStoragePlans />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/games" element={<AllGames />} />
          <Route path="/games/enshrouded" element={<EnshroudedPlans />} />
          <Route path="/games/project-zomboid" element={<ProjectZomboidPlans />} />
          <Route path="/games/terraria" element={<TerrariaPlans />} />
          <Route path="/games/valheim" element={<ValheimPlans />} />
          <Route path="/games/7-days-to-die" element={<SevenDaysToDiePlans />} />
          <Route path="/games/ark-survival" element={<ArkSurvivalPlans />} />
          <Route path="/games/satisfactory" element={<SatisfactoryPlans />} />
          <Route path="/games/arma-3" element={<Arma3Plans />} />
          <Route path="/vps/intel-platinum" element={<IntelPlatinumVPS />} />
          <Route path="/vps/intel-xeon" element={<IntelXeonVPS />} />
          <Route path="/vps/amd-ryzen" element={<AMDRyzenVPS />} />
          <Route path="/vps/amd-epyc" element={<AMDEpycVPS />} />
          <Route path="/downloads" element={<Downloads />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
