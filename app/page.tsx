import { FeedClient } from "@/components/feed";
import { getFeedPosts, getPostRooms } from "@/app/posts/queries";
import { getCurrentAppProfile } from "@/utils/supabase/profile";

export default async function Home() {
  const profile = await getCurrentAppProfile();
  const canCreatePost =
    profile?.status === "active" &&
    (profile.role === "staff" || profile.role === "admin");
  const [posts, rooms] = await Promise.all([
    getFeedPosts(),
    canCreatePost ? getPostRooms(profile) : Promise.resolve([]),
  ]);

  return (
    <FeedClient
      posts={posts}
      rooms={rooms}
      displayName={profile?.fullName ?? "equipo"}
      canCreatePost={canCreatePost}
    />
  );
}
