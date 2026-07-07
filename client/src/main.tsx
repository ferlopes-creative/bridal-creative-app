import { createRoot } from "react-dom/client";
import App from "./App";
import { initSupabaseAuth } from "@/lib/authSession";
import "./index.css";

initSupabaseAuth();

createRoot(document.getElementById("root")!).render(<App />);
