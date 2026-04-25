import { useQuery } from "@tanstack/react-query";
import { externalSupabase } from "@/lib/externalSupabase";

type Platform = 'twitter' | 'instagram' | 'facebook' | 'tiktok';

const TABLE_MAP: Record<Platform, string> = {
  twitter: 'Twitter_comentarios',
  instagram: 'Instagram_comentarios',
  facebook: 'Facebook_comentarios',
  tiktok: 'TikTok_comentarios',
};

export interface PostComment {
  username: string;
  comentario: string;
  sentimiento: string;
}

async function fetchCommentsForPost(platform: Platform, postId: number): Promise<PostComment[]> {
  const tableName = TABLE_MAP[platform];
  const results: PostComment[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await externalSupabase
      .from(tableName)
      .select('username, comentario, sentimiento')
      .eq('post_id', postId)
      .range(from, from + pageSize - 1);

    if (error) {
      console.error(`Error fetching comments for post ${postId}:`, error);
      break;
    }
    if (!data || data.length === 0) break;
    results.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return results;
}

export function usePostCommentsData(platform: Platform | null, postId: number | null) {
  return useQuery({
    queryKey: ['post-comments', platform, postId],
    queryFn: () => fetchCommentsForPost(platform!, postId!),
    enabled: !!platform && postId !== null,
    staleTime: 5 * 60 * 1000,
  });
}
