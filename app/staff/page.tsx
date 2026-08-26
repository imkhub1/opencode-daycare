import { getFeedPosts, getPostRooms } from "@/app/posts/queries";
import { FeedClient } from "@/components/feed";
import { requireArea } from "@/utils/supabase/profile";

export default async function StaffHome() {
  const profile = await requireArea("staff");
  const [posts, rooms] = await Promise.all([getFeedPosts(), getPostRooms(profile)]);

  return (
    <FeedClient
      posts={posts}
      rooms={rooms}
      displayName={profile.fullName}
      canCreatePost
      currentUserId={profile.id}
      canDeleteAnyPost
    />
  );
}
