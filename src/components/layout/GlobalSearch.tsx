import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function GlobalSearch() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Buscar pacientes, citas, casos..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-9 w-full"
      />
    </div>
  );
}
