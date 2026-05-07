import { useState, useEffect, useMemo } from "react";
import { NetworkMember, NetworkMemberWithChildren, NetworkTree, NetworkSibling } from "@/types/network";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

interface UseNetworkDataResult {
  tree: NetworkTree | null;
  globalTotal: number;
  latestJoinDate: string | null;
  allMembers: NetworkMember[];
  isLoading: boolean;
  error: string | null;
}

// Función para construir el árbol jerárquico a partir de datos planos
function buildTree(
  members: NetworkMember[],
  parentId: number
): NetworkMemberWithChildren[] {
  return members
    .filter((m) => {
      const refId = m.refiereid ? parseInt(String(m.refiereid), 10) : null;
      return refId === parentId;
    })
    .map((member) => ({
      ...member,
      children: buildTree(members, member.id),
    }));
}

// Fetch all members from the local NodeJS backend via relative path
async function fetchAllMembers(): Promise<NetworkMember[]> {
  try {
    const response = await fetch(`${API_BASE}/api/chatbot/todas-las-personas`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // En producción real, este secreto no debería estar hardcodeado en el frontend
        // pero para bypass local/proxy es la manera de acceder.
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return (data as NetworkMember[]) || [];
  } catch (error: any) {
    throw new Error(error.message);
  }
}

// Hook for searching by user ID (used in admin/search page)
export function useNetworkData(userId: number | null): UseNetworkDataResult {
  const [members, setMembers] = useState<NetworkMember[]>([]);
  const [globalTotal, setGlobalTotal] = useState(0);
  const [latestJoinDate, setLatestJoinDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNetworkData() {
      try {
        setIsLoading(true);
        setError(null);

        const data = await fetchAllMembers();

        setMembers(data);
        setGlobalTotal(data.length);
        
        // Find the most recent join date
        if (data.length > 0) {
          const sorted = [...data].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setLatestJoinDate(sorted[0].created_at);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar datos");
      } finally {
        setIsLoading(false);
      }
    }

    fetchNetworkData();
  }, []);

  const tree = useMemo(() => {
    if (!userId || members.length === 0) return null;

    const you = members.find((m) => m.id === userId);
    if (!you) return null;

    const referrer = you.refiereid
      ? members.find((m) => m.id === parseInt(you.refiereid!, 10)) || null
      : null;

    // Build hierarchical tree for all descendants
    const invited = buildTree(members, userId);

    // Find siblings (same referrer, not self)
    const siblings: NetworkSibling[] = you.refiereid
      ? members
          .filter((m) => m.refiereid === you.refiereid && m.id !== userId)
          .map((m) => ({
            id: m.id,
            direct_count: parseInt(String(m.direct_descendants_count || 0), 10),
            total_count: parseInt(String(m.total_descendants_count || 0), 10),
            created_at: m.created_at,
          }))
      : [];

    return { referrer, you, invited, siblings };
  }, [members, userId]);

  return { tree, globalTotal, latestJoinDate, allMembers: members, isLoading, error };
}

// Hook for searching by hash_code (used in personal URL view)
export function useNetworkDataByHash(hashCode: string | null): UseNetworkDataResult {
  const [tree, setTree] = useState<NetworkTree | null>(null);
  const [globalTotal, setGlobalTotal] = useState(0);
  const [latestJoinDate, setLatestJoinDate] = useState<string | null>(null);
  const [allMembers, setAllMembers] = useState<NetworkMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchByHashCode() {
      if (!hashCode) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch all members from edge function
        const allMembers = await fetchAllMembers();
        
        // Find the user by hash_code
        const user = allMembers.find((m) => m.hash_code === hashCode);

        if (!user) {
          setTree(null);
          setIsLoading(false);
          return;
        }

        // Find referrer if exists
        let referrer: NetworkMember | null = null;
        if (user.refiereid) {
          referrer = allMembers.find((m) => m.id === parseInt(user.refiereid!, 10)) || null;
        }

        // Find all descendants using path prefix
        const descendants = allMembers.filter((m) => {
          // Aseguramos que tanto el path del miembro evaluado como el del usuario actual existan
          if (!m.path || !user.path) return false;
          return m.path.startsWith(`${user.path}.`);
        });
        
        setAllMembers(allMembers);
        setGlobalTotal(allMembers.length);
        
        // Find the most recent join date from the user's network
        const networkMembers = [user, ...descendants];
        if (networkMembers.length > 0) {
          const sorted = [...networkMembers].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setLatestJoinDate(sorted[0].created_at);
        }
        
        // Build hierarchical tree from flat data
        const invitedTree = buildTree(descendants, user.id);

        // Find siblings (same referrer, not self)
        const siblings: NetworkSibling[] = user.refiereid
          ? allMembers
              .filter((m) => m.refiereid === user.refiereid && m.id !== user.id)
              .map((m) => ({
                id: m.id,
                direct_count: parseInt(String(m.direct_descendants_count || 0), 10),
                total_count: parseInt(String(m.total_descendants_count || 0), 10),
                created_at: m.created_at,
              }))
          : [];

        setTree({
          referrer,
          you: user,
          invited: invitedTree,
          siblings,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar datos");
      } finally {
        setIsLoading(false);
      }
    }

    fetchByHashCode();
  }, [hashCode]);

  return { tree, globalTotal, latestJoinDate, allMembers, isLoading, error };
}
