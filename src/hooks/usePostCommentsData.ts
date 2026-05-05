import { useQuery } from "@tanstack/react-query";
import { SocialComment } from "@/types/network";

type Platform = 'twitter' | 'instagram' | 'facebook' | 'tiktok';

async function fetchCommentsForPost(platform: Platform, postId: string): Promise<SocialComment[]> {
  try {
    // Es posible que necesitemos usar encodeURIComponent si postId tiene caracteres raros
    const url = `/api/chatbot/comentarios-de-post/${platform}/${encodeURIComponent(postId)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": "ch!3n4t0rS3cr3tK3y",
      }
    });

    if (!response.ok) {
      console.error(`Error fetching comments for post ${postId}: API returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data || [];
  } catch (err) {
    console.error(`Exception fetching comments for post ${postId}:`, err);
    return [];
  }
}

export function usePostCommentsData(platform: Platform | null, postId: string | null) {
  return useQuery({
    queryKey: ['post-comments', platform, postId],
    queryFn: () => {
      if (!platform || !postId) return [];
      // Cast postId to string to ensure compatibility with our new fetch
      return fetchCommentsForPost(platform, String(postId));
    },
    enabled: !!platform && !!postId,
    staleTime: 5 * 60 * 1000,
  });
}
