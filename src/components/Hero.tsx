import { Cpu, User } from 'lucide-react';
import ScrollReveal from '@/components/ScrollReveal';

const Hero = () => {
  return (
    <section className="pt-8 pb-16 px-4">
      <div className="container mx-auto text-center">
        <ScrollReveal animation="fade-up">
          <div className="section-badge mb-6">
            <Cpu className="w-4 h-4" />
            <span>NEXT-GEN GAME HOSTING</span>
          </div>
        </ScrollReveal>

        <ScrollReveal animation="fade-up" delay={100}>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="gradient-text-cyan text-glow-cyan">BUILT FOR SPEED.</span>
            <br />
            <span className="gradient-text-cyan text-glow-cyan">OPTIMIZED FOR PLAY.</span>
          </h1>
        </ScrollReveal>

        <ScrollReveal animation="fade-up" delay={200}>
          <p className="max-w-2xl mx-auto text-muted-foreground text-sm md:text-base mb-8">
            Premium game server hosting since 2025. Fully optimized for all Minecraft versions with seamless modding support. Reliable, fast, and backed by expert 24/7 support.
          </p>
        </ScrollReveal>

        <ScrollReveal animation="scale-in" delay={300}>
          <div className="flex items-center justify-center gap-4">
            <a href="/games/minecraft">
              <button className="btn-primary-gradient px-8 py-3 rounded-lg font-semibold text-foreground">
                CREATE SERVER
              </button>
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default Hero;
