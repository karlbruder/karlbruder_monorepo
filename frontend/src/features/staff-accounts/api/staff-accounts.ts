import { currentSessionGeneration } from "@/lib/session-generation";
import { backendFetch } from "@/lib/backend-api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const applicationRoles = ["regular_user", "guild_member", "admin"] as const;
export type ApplicationRole = typeof applicationRoles[number];

export type StaffAccount = {
  id: string;
  email: string | null;
  role: ApplicationRole;
};

type StaffAccountPage = {
  users: StaffAccount[];
  next_page: number | null;
};

export class StaffAccountError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Staff account request failed: ${status}`);
    this.status = status;
  }
}

async function request<T>(userId: string, path: string, init: RequestInit): Promise<T> {
  const response = await backendFetch(`/staff/users${path}`, init, { authentication: "required", expectedAccountId: userId });
  if (!response.ok) throw new StaffAccountError(response.status);
  return response.json();
}

function accountDirectoryKey(actorId: string) {
  return ["staff-accounts", actorId];
}

export function useStaffAccounts(actorId: string) {
  return useQuery({
    queryKey: accountDirectoryKey(actorId),
    queryFn: async ({ signal }) => {
      const accounts = new Map<string, StaffAccount>();
      let page: number | null = 1;
      while (page !== null) {
        const result: StaffAccountPage = await request(actorId, `?page=${page}&per_page=100`, { signal });
        for (const account of result.users) accounts.set(account.id, account);
        page = result.next_page;
      }
      return [...accounts.values()];
    },
  });
}

export function useUpdateStaffAccountRole(actorId: string, accountId: string) {
  const client = useQueryClient();
  const queryKey = accountDirectoryKey(actorId);
  return useMutation({
    onMutate: () => currentSessionGeneration(),
    mutationFn: (role: ApplicationRole) => request<StaffAccount>(
      actorId,
      `/${encodeURIComponent(accountId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      },
    ),
    onSuccess: async (updated, _role, generation) => {
      if (generation !== currentSessionGeneration()) return;
      await client.cancelQueries({ queryKey });
      if (generation !== currentSessionGeneration()) return;
      client.setQueryData<StaffAccount[]>(queryKey, (accounts) =>
        accounts?.map((account) => account.id === updated.id ? updated : account),
      );
      await client.invalidateQueries({ queryKey });
    },
  });
}
