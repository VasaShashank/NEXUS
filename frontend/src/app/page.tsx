import dynamic from "next/dynamic";

// Load the entire app shell only on the client side.
// This completely eliminates server/client hydration mismatches because
// no SSR HTML is generated — the browser is the sole renderer.
const AppShell = dynamic(() => import("@/components/AppShell"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#06080D] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0EA5E9] via-[#2563EB] to-[#8B5CF6] flex items-center justify-center text-white font-black text-base shadow-lg animate-pulse">
          N
        </div>
        <div className="text-[13px] text-slate-500 font-medium tracking-wide">
          Loading NEXUS…
        </div>
      </div>
    </div>
  ),
});

export default function Home() {
  return <AppShell />;
}
