import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import AdminPanel from "@/components/AdminPanel";

export default function AdminNew() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full bg-[#F7F5F0] px-3 py-6 md:px-6">
      <div className="mx-auto w-full max-w-4xl">
        <button
          type="button"
          onClick={() => setLocation("/admin")}
          className="mb-4 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-200/50"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </button>
        <AdminPanel />
      </div>
    </div>
  );
}
