import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { API_BASE_URL } from "./config";

// AppRouterの型定義（バックエンドと共有）
// 実際の型はサーバーから生成されるが、ここでは簡易的に定義
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc = createTRPCReact<any>();

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const createTRPCClient = () => {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${API_BASE_URL}/api/trpc`,
        headers() {
          return authToken
            ? {
                Authorization: `Bearer ${authToken}`,
              }
            : {};
        },
        transformer: superjson,
      }),
    ],
  });
};
