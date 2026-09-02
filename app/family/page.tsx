import { Icon } from "@/components/shared/Icon";
import { getServerDictionary } from "@/utils/i18n/server";
import { requireArea } from "@/utils/supabase/profile";

export default async function FamilyHome() {
  await requireArea("family");
  const dictionary = await getServerDictionary();

  return (
    <main className="mx-auto flex min-h-[calc(100vh-70px)] w-full max-w-[880px] items-center justify-center px-5 py-10 sm:min-h-screen sm:px-10">
      <section
        aria-labelledby="family-placeholder-title"
        className="w-full max-w-[520px] rounded-[24px] border border-line bg-surface px-6 py-10 text-center shadow-theme-sm sm:px-10"
      >
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-coral-soft text-coral-deep">
          <Icon name="home" className="size-7" />
        </span>
        <p className="mt-6 text-xs font-extrabold tracking-[0.08em] text-coral-deep">
          {dictionary.navigation.familySubtitle}
        </p>
        <h1 id="family-placeholder-title" className="mt-2 font-display text-3xl font-semibold text-ink">
          {dictionary.family.title}
        </h1>
        <p className="mx-auto mt-3 max-w-[390px] text-[15px] leading-relaxed text-muted">
          {dictionary.family.description}
        </p>
      </section>
    </main>
  );
}
