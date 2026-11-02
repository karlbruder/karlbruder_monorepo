import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query-client";
import { AuthSessionProvider } from "@/features/auth/components/auth-session-provider";
import { LanguageProvider } from "@/components/language-provider";

export default function AppProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSessionProvider>
        <LanguageProvider>{children}</LanguageProvider>
      </AuthSessionProvider>
    </QueryClientProvider>
  );
}
