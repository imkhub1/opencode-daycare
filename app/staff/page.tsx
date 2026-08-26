import { getFeedPosts, getPostRooms } from "@/app/posts/queries";
import { FeedClient } from "@/components/feed";
import { requireArea } from "@/utils/supabase/profile";
import { getServerDictionary } from "@/utils/i18n/server";

export default async function StaffHome() {
  const profile = await requireArea("staff");
  const [posts, rooms] = await Promise.all([getFeedPosts(), getPostRooms(profile)]);
  const dictionary = await getServerDictionary();

  return (
    <FeedClient
      posts={posts}
      rooms={rooms}
      displayName={profile.fullName}
      canCreatePost
      currentUserId={profile.id}
      canDeleteAnyPost
      dictionary={dictionary}
    />
  );
}
