import { Wrench } from 'lucide-react';

export default function Maintenance() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0b1e] relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#1cc4e8]/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#1cc4e8]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#1cc4e8]/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
      <div className="text-center relative z-10">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-[#1cc4e8]/10 flex items-center justify-center">
            <Wrench className="w-10 h-10 text-[#1cc4e8]" />
          </div>
        </div>
        <h1 className="mb-4 text-4xl font-bold text-[#f1f5f9]">Under Maintenance</h1>
        <p className="mb-8 text-xl text-[#64748b]">We'll be back shortly</p>
      </div>
    </div>
  );
}
