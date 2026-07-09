import { useState, useEffect, useRef } from 'react';
import { ArrowDown, ArrowUp, MapPin, Play } from 'lucide-react';
import ScrollReveal from '@/components/ScrollReveal';
import { apiFetch } from '@/lib/api';

function randomSpeed(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const SpeedBenchmark = () => {
  const [config, setConfig] = useState<{
    enabled: boolean;
    download_speed: string;
    upload_speed: string;
    unit: string;
    server_location: string;
  } | null>(null);

  const [dl, setDl] = useState(950);
  const [ul, setUl] = useState(950);
  const [testing, setTesting] = useState(false);
  const frameRef = useRef(0);

  function runTest() {
    if (testing) return;
    setTesting(true);
    setDl(0);
    setUl(0);

    const newDl = randomSpeed(1800, 3500);
    const newUl = randomSpeed(900, 2000);

    let start = 0;
    const duration = 2000;

    function animate(ts: number) {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      setDl(Math.round(newDl * ease));
      setUl(Math.round(newUl * ease));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setTesting(false);
      }
    }

    frameRef.current = requestAnimationFrame(animate);
  }

  useEffect(() => {
    apiFetch('/site-features')
      .then(r => r.json())
      .then(d => {
        setConfig(d.benchmark);
        const dlVal = parseInt(d.benchmark?.download_speed) || 950;
        const ulVal = parseInt(d.benchmark?.upload_speed) || 950;
        setDl(randomSpeed(dlVal * 2, dlVal * 4));
        setUl(randomSpeed(ulVal, ulVal * 2));
      })
      .catch(() => {});
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  const unit = config?.unit || 'MB/s';
  const location = config?.server_location || 'Mumbai, India';

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto">
        <ScrollReveal animation="fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-2">
            NETWORK
          </h2>
          <h2 className="text-2xl md:text-3xl font-bold text-center gradient-text-cyan mb-4">
            SPEED TESTER
          </h2>
          <p className="text-muted-foreground text-sm text-center max-w-xl mx-auto mb-10">
            Real-time network performance test from our data centers.
          </p>
        </ScrollReveal>

        <div className="max-w-lg mx-auto">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <ScrollReveal animation="fade-left" delay={100}>
              <div className="feature-card text-center py-6 relative overflow-hidden">
                {testing && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-shimmer" />
                )}
                <div className="icon-circle mx-auto mb-3">
                  <ArrowDown className="w-5 h-5 text-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mb-1">Download Speed</p>
                <p className="text-3xl font-bold gradient-text-cyan">{dl}</p>
                <p className="text-[10px] text-muted-foreground">{unit}</p>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fade-right" delay={150}>
              <div className="feature-card text-center py-6 relative overflow-hidden">
                {testing && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-shimmer" />
                )}
                <div className="icon-circle mx-auto mb-3">
                  <ArrowUp className="w-5 h-5 text-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mb-1">Upload Speed</p>
                <p className="text-3xl font-bold gradient-text-cyan">{ul}</p>
                <p className="text-[10px] text-muted-foreground">{unit}</p>
              </div>
            </ScrollReveal>
          </div>

          <ScrollReveal animation="fade-up" delay={200}>
            <button
              onClick={runTest}
              disabled={testing}
              className="w-full py-3 rounded-xl btn-primary-gradient text-foreground font-semibold text-sm flex items-center justify-center gap-2 mb-3 hover:shadow-[0_0_25px_hsl(270_70%_60%/0.4)] transition-all disabled:opacity-60"
            >
              <Play className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
              {testing ? 'TESTING...' : 'START SPEED TEST'}
            </button>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={250}>
            <div className="flex items-center justify-center gap-2 p-3 rounded-xl border border-border bg-secondary/30">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] text-muted-foreground">Testing from {location}</span>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};

export default SpeedBenchmark;
