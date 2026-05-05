import { useQuery } from "@tanstack/react-query";
import { NetworkMember, UserCommentsSummary, CommentsDataMap } from "@/types/network";

type Platform = 'twitter' | 'instagram' | 'facebook' | 'tiktok';

function normalizeUsername(username: string | null | undefined): string {
  if (!username) return '';
  return username.toLowerCase().replace('@', '').trim();
}

async function fetchAllCommentsForPlatform(
  platform: Platform
): Promise<{ username: string; sentimiento: string }[]> {
  try {
    const response = await fetch(`/api/chatbot/comentarios/${platform}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": "ch!3n4t0rS3cr3tK3y",
      }
    });

    if (!response.ok) {
      console.error(`Error fetching ${platform} comments: API returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error(`Error fetching ${platform} comments:`, error);
    return [];
  }
}

function buildUsernameMap(members: NetworkMember[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const member of members) {
    const memberId = String(member.id);
    // IMPORTANTE: En Supabase los campos se llamaban _username, pero la base de datos de 
    // Postgres (y la API) los devuelve como _handle. Hay que leer _handle y hacer fallback a _username.
    const handles = [
      (member as any).facebook_handle || member.facebook_username,
      (member as any).instagram_handle || member.instagram_username,
      (member as any).twitter_handle || member.twitter_username,
      (member as any).tiktok_handle || member.tiktok_username,
    ];
    for (const handle of handles) {
      const normalized = normalizeUsername(handle);
      if (normalized && !map.has(normalized)) {
        map.set(normalized, memberId);
      }
    }
  }
  return map;
}

function buildCommentsMap(
  usernameMap: Map<string, string>,
  allResults: { platform: Platform; data: { username: string; sentimiento: string }[] }[]
): CommentsDataMap {
  // Accumulate stats: memberId -> platform -> counts
  const stats = new Map<string, Map<Platform, { total: number; positivo: number; negativo: number; neutro: number }>>();

  for (const { platform, data } of allResults) {
    for (const row of data) {
      const normalized = normalizeUsername(row.username);
      if (!normalized) continue;
      const memberId = usernameMap.get(normalized);
      if (!memberId) continue;

      if (!stats.has(memberId)) stats.set(memberId, new Map());
      const platformMap = stats.get(memberId)!;
      if (!platformMap.has(platform)) platformMap.set(platform, { total: 0, positivo: 0, negativo: 0, neutro: 0 });
      const entry = platformMap.get(platform)!;
      entry.total++;
      const sent = (row.sentimiento || '').toLowerCase();
      if (sent === 'positivo') entry.positivo++;
      else if (sent === 'negativo') entry.negativo++;
      else entry.neutro++;
    }
  }

  // Convert to CommentsDataMap
  const result: CommentsDataMap = new Map();
  for (const [memberId, platformMap] of stats) {
    const summaries: UserCommentsSummary[] = [];
    for (const [platform, counts] of platformMap) {
      summaries.push({ platform, ...counts });
    }
    result.set(memberId, summaries);
  }
  return result;
}

export function useCommentsData(members: NetworkMember[]) {
  return useQuery({
    queryKey: ['social-comments', members.map(m => m.id).sort().join(',')],
    queryFn: async () => {
      const platforms: Platform[] = ['twitter', 'instagram', 'facebook', 'tiktok'];

      // Fetch all comments from all platforms in parallel via our local NodeJS API
      const results = await Promise.all(
        platforms.map(async (platform) => ({
          platform,
          data: await fetchAllCommentsForPlatform(platform),
        }))
      );

      // Build unified username map from all member handles
      const usernameMap = buildUsernameMap(members);

      // Cross-reference comments against the unified map
      return buildCommentsMap(usernameMap, results);
    },
    enabled: members.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
