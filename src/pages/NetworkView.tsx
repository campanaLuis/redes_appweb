import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useNetworkDataByHash } from "@/hooks/useNetworkData";
import { useCommentsData } from "@/hooks/useCommentsData";
import { NetworkHeader } from "@/components/network/NetworkHeader";
import { NetworkTree } from "@/components/network/NetworkTree";
import { Loader2, AlertCircle, Network } from "lucide-react";
import { Button } from "@/components/ui/button";

const NetworkView = () => {
  const { hashCode } = useParams<{ hashCode: string }>();
  const { tree, globalTotal, latestJoinDate, allMembers, isLoading, error } = useNetworkDataByHash(hashCode || null);

  // Hooks must be called before any early returns
  const { data: commentsData } = useCommentsData(allMembers);
  const commentsMap = useMemo(() => commentsData || new Map(), [commentsData]);

  // No hash code in URL
  if (!hashCode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Network className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-foreground font-medium mb-2">Redes de afinidad</p>
        <p className="text-muted-foreground text-sm text-center">
          agrega hashcode al url para ver tu red.
        </p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Cargando tu red...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <p className="text-destructive font-medium mb-2">Error al cargar</p>
        <p className="text-muted-foreground text-sm text-center mb-4">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Intentar de nuevo
        </Button>
      </div>
    );
  }

  // User not found
  if (!tree) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Network className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-foreground font-medium mb-2">Usuario no encontrado</p>
        <p className="text-muted-foreground text-sm text-center">
          No encontramos un usuario con el código proporcionado
        </p>
      </div>
    );
  }

  const directCount = parseInt(String(tree.you.direct_descendants_count || 0), 10);
  const totalDescendants = parseInt(String(tree.you.total_descendants_count || 0), 10);
  const indirectCount = totalDescendants - directCount;
  const totalNetwork = totalDescendants + 1;

  // Success: show tree
  return (
    <div className="min-h-fit overflow-hidden bg-background flex flex-col scrollbar-hide">
      <NetworkHeader
        memberName={tree.you.nombre}
        directCount={directCount}
        indirectCount={indirectCount}
        totalNetwork={totalNetwork}
        globalTotal={globalTotal}
        joinDate={tree.you.created_at}
        latestJoinDate={latestJoinDate}
        rootMember={tree.you}
        commentsData={commentsMap}
        referrerName={tree.referrer?.nombre ?? null}
      />
      <main className="flex-1 overflow-hidden">
        <NetworkTree tree={tree} allMembers={allMembers} globalTotal={globalTotal} commentsData={commentsMap} />
      </main>
    </div>
  );
};

export default NetworkView;
