import { useQuery } from "@tanstack/react-query";
import { externalSupabase } from "@/lib/externalSupabase";
import { SocialPost } from "@/types/network";

type Platform = 'twitter' | 'instagram' | 'facebook' | 'tiktok';

const TABLE_MAP: Record<Platform, string> = {
  twitter: 'Twitter_posts',
  instagram: 'Instagram_posts',
  facebook: 'Facebook_posts',
  tiktok: 'TikTok_posts',
};

async function fetchAllPostsForPlatform(platform: Platform): Promise<SocialPost[]> {
  const tableName = TABLE_MAP[platform];
  const results: SocialPost[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await externalSupabase
      .from(tableName)
      .select('post_id, username, posted_date, url, caption, likes, comentarios')
      .order('posted_date', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error(`Error fetching ${platform} posts:`, error);
      break;
    }
    if (!data || data.length === 0) break;
    results.push(...data.map((row: any) => ({ ...row, platform })));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return results;
}

export function usePostsData() {
  return useQuery({
    queryKey: ['social-posts'],
    queryFn: async () => {
      const platforms: Platform[] = ['twitter', 'instagram', 'facebook', 'tiktok'];
      const results = await Promise.all(platforms.map(p => fetchAllPostsForPlatform(p)));
      const allPosts = results.flat();
      allPosts.sort((a, b) => new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime());
      return allPosts;
    },
    staleTime: 5 * 60 * 1000,
  });
}
