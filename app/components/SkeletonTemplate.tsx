import z from "zod";

export const props = z.object();

/**
 * Temporary placeholder shown until the real homepage is built.
 *
 * Deliberately shapeless: an earlier version drew a page blueprint (header, hero, 3 cards,
 * 2 columns, 4 features, footer), and the agents building the site read it as the layout to
 * reproduce. The site's layout comes from its Design Brief (`docs/DESIGN.md`), not from here.
 */
export default function SkeletonTemplate() {
  return (
    <div className="w-full min-h-screen bg-base-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4" aria-hidden="true">
        <div className="animate-pulse delay-200 bg-black/5 dark:bg-white/5 h-4 w-2/3"></div>
        <div className="animate-pulse delay-300 bg-black/5 dark:bg-white/5 h-4 w-full"></div>
        <div className="animate-pulse delay-400 bg-black/5 dark:bg-white/5 h-4 w-5/6"></div>
      </div>
    </div>
  );
}
