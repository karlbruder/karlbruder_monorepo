import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiBaseUrl } from "@/config/environment";
import { apiFetch } from "@/lib/api-fetch";

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

async function request<T>(token: string, path: string, init: RequestInit): Promise<T> {
  const response = await apiFetch(`${apiBaseUrl()}/staff/users${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });
  if (!response.ok) throw new StaffAccountError(response.status);
  return response.json();
}

function accountDirectoryKey(actorId: string) {
  return ["staff-accounts", actorId];
}

export function useStaffAccounts(token: string, actorId: string) {
  return useQuery({
    queryKey: accountDirectoryKey(actorId),
    queryFn: async ({ signal }) => {
      const accounts = new Map<string, StaffAccount>();
      let page: number | null = 1;
      while (page !== null) {
        const result: StaffAccountPage = await request(token, `?page=${page}&per_page=100`, { signal });
        for (const account of result.users) accounts.set(account.id, account);
        page = result.next_page;
      }
      return [...accounts.values()];
    },
  });
}

export function useUpdateStaffAccountRole(token: string, actorId: string, accountId: string) {
  const client = useQueryClient();
  const queryKey = accountDirectoryKey(actorId);
  return useMutation({
    mutationFn: (role: ApplicationRole) => request<StaffAccount>(
      token,
      `/${encodeURIComponent(accountId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      },
    ),
    onSuccess: async (updated) => {
      await client.cancelQueries({ queryKey });
      client.setQueryData<StaffAccount[]>(queryKey, (accounts) =>
        accounts?.map((account) => account.id === updated.id ? updated : account),
      );
      await client.invalidateQueries({ queryKey });
    },
  });
}
