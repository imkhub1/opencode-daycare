import { getFeedPosts } from "@/app/posts/queries";
import { FeedClient } from "@/components/feed";
import { requireArea } from "@/utils/supabase/profile";
import { getServerDictionary } from "@/utils/i18n/server";

export default async function FamilyHome() {
  const profile = await requireArea("family");
  const posts = await getFeedPosts();
  const dictionary = await getServerDictionary();

  return (
    <FeedClient
      posts={posts}
      rooms={[]}
      displayName={profile.fullName}
      canCreatePost={false}
      currentUserId={profile.id}
      canDeleteAnyPost={false}
      dictionary={dictionary}
    />
  );
}
