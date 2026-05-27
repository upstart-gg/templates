import z from "zod";

export const props = z.object();

export default function SkeletonTemplate() {
  return (
    <div className="w-full min-h-screen bg-base-100 p-6">
      {/* Header */}
      <div className="animate-pulse delay-200 bg-black/5 dark:bg-white/5 h-16 w-full mb-6"></div>

      {/* Hero Section */}
      <div className="animate-pulse delay-300 bg-black/5 dark:bg-white/5  h-64 w-full mb-6"></div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="animate-pulse delay-400 bg-black/5 dark:bg-white/5  h-48 w-full"></div>
        <div className="animate-pulse delay-500 bg-black/5 dark:bg-white/5  h-48 w-full"></div>
        <div className="animate-pulse delay-600 bg-black/5 dark:bg-white/5  h-48 w-full"></div>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <div className="animate-pulse delay-700 bg-black/5 dark:bg-white/5  h-8 w-3/4"></div>
          <div className="animate-pulse delay-800 bg-black/5 dark:bg-white/5  h-4 w-full"></div>
          <div className="animate-pulse delay-900 bg-black/5 dark:bg-white/5  h-4 w-full"></div>
          <div className="animate-pulse delay-1000 bg-black/5 dark:bg-white/5  h-4 w-2/3"></div>
        </div>
        <div className="animate-pulse delay-1100 bg-black/5 dark:bg-white/5  h-64 w-full"></div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="animate-pulse delay-1200 bg-black/5 dark:bg-white/5  h-32 w-full"></div>
        <div className="animate-pulse delay-1300 bg-black/5 dark:bg-white/5  h-32 w-full"></div>
        <div className="animate-pulse delay-1400 bg-black/5 dark:bg-white/5  h-32 w-full"></div>
        <div className="animate-pulse delay-1500 bg-black/5 dark:bg-white/5  h-32 w-full"></div>
      </div>

      {/* Footer */}
      <div className="animate-pulse delay-1600 bg-black/5 dark:bg-white/5  h-24 w-full"></div>
    </div>
  );
}
