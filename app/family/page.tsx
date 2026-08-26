import { getFeedPosts } from "@/app/posts/queries";
import { FeedClient } from "@/components/feed";
import { requireArea } from "@/utils/supabase/profile";

export default async function FamilyHome() {
  const profile = await requireArea("family");
  const posts = await getFeedPosts();

  return (
    <FeedClient
      posts={posts}
      rooms={[]}
      displayName={profile.fullName}
      canCreatePost={false}
      currentUserId={profile.id}
      canDeleteAnyPost={false}
    />
  );
}
