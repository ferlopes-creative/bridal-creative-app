import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen w-full bg-background flex justify-center px-6 py-10">
      <div className="w-full max-w-md lg:max-w-6xl">
        {children}
      </div>
    </div>
  );
}