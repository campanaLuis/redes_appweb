import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Network } from "lucide-react";

const Index = () => {
  const [inputValue, setInputValue] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      navigate(`/red/${trimmed}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
          <Network className="h-10 w-10 text-primary" />
        </div>
        
        <h1 className="text-2xl font-bold text-foreground text-center mb-2">
          Redes de afinidad
        </h1>
        <p className="text-muted-foreground text-center mb-8 max-w-xs">
          Ingresa tu código para ver tu red de conexiones
        </p>

        <div className="w-full max-w-xs space-y-3">
          <Input
            type="text"
            placeholder="Escribe tu código aquí"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.slice(0, 15))}
            onKeyDown={handleKeyDown}
            maxLength={15}
            className="text-center text-lg h-12"
          />
          <Button onClick={handleSearch} className="w-full h-12" disabled={!inputValue.trim()}>
            <Search className="h-4 w-4 mr-2" />
            Ver mi red
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
