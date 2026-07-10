import { Wrench } from "lucide-react";

const Maintenance = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>
      <div className="text-center relative z-10">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Wrench className="w-10 h-10 text-primary" />
          </div>
        </div>
        <h1 className="mb-4 text-4xl font-bold text-foreground">Under Maintenance</h1>
        <p className="mb-8 text-xl text-muted-foreground">
          We&apos;re performing scheduled maintenance. We&apos;ll be back shortly.
        </p>
        <a
          href="/"
          className="inline-block text-primary underline hover:text-primary/90 transition-colors"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default Maintenance;
