import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query-client";
import type { ReactNode } from "react";
import { AppContext } from "@/app/app-context";
import { useAppAuth } from "@/features/auth/hooks/use-app-auth";
import { useRegistrationLanguage } from "@/hooks/use-registration-language";

export default function AppProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  const auth = useAppAuth();
  const language = useRegistrationLanguage();
  return (
    <QueryClientProvider client={queryClient}>
      <AppContext value={{ auth, ...language }}>{children}</AppContext>
    </QueryClientProvider>
  );
}
