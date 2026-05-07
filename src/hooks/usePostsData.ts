import { useQuery } from "@tanstack/react-query";

type Platform = 'twitter' | 'instagram' | 'facebook' | 'tiktok';

export interface SocialPost {
  post_id: string;
  username: string;
  posted_date: string;
  url: string;
  caption: string;
  likes: number;
  comentarios: number;
  platform: Platform;
  scrap_realizado: string;
}

async function fetchPostsForPlatform(platform: Platform): Promise<SocialPost[]> {
  try {
    const response = await fetch(`/api/chatbot/posts/${platform}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      }
    });

    if (!response.ok) {
      console.error(`[DEBUG] HTTP Error fetching ${platform} posts: Status ${response.status}`);
      return [];
    }

    const data = await response.json();
    console.log(`[DEBUG] Raw data received for ${platform}:`, data);
    
    // Safety check just in case the API returned an object error instead of an array
    if (!Array.isArray(data)) {
      console.error(`[DEBUG] Expected array but received:`, typeof data);
      return [];
    }

    return data.map((post: any) => ({
      ...post,
      platform
    }));
  } catch (error) {
    console.error(`[DEBUG] Exception in fetchPostsForPlatform (${platform}):`, error);
    return [];
  }
}

export function usePostsData() {
  return useQuery({
    queryKey: ['social-posts'],
    queryFn: async () => {
      const platforms: Platform[] = ['twitter', 'instagram', 'facebook', 'tiktok'];
      
      const results = await Promise.all(
        platforms.map(fetchPostsForPlatform)
      );

      // Combine and sort by date descending
      const allPosts = results.flat().sort((a, b) => {
        return new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime();
      });
      
      console.log(`[DEBUG] Final aggregated posts count: ${allPosts.length}`);
      return allPosts;
    },
    staleTime: 5 * 60 * 1000,
  });
}
