import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type AuthState = {
  user: User | null;
  session: Session | null;
  role: "CITIZEN" | "ADMIN" | null;
  fullName: string;
  loading: boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  role: null,
  fullName: "",
  loading: true,
  isAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<"CITIZEN" | "ADMIN" | null>(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    try {
      const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
        if (!active) return;
        setSession(next);
        if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
          router.invalidate();
          if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
        }
      });
      unsubscribe = () => sub.subscription.unsubscribe();

      supabase.auth
        .getSession()
        .then(({ data }) => {
          if (!active) return;
          setSession(data.session);
        })
        .catch((error) => {
          console.error("[Auth] Could not load Supabase session", error);
          if (active) setSession(null);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } catch (error) {
      console.error("[Auth] Supabase auth initialization failed", error);
      setSession(null);
      setLoading(false);
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [router, queryClient]);

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) {
      setRole(null);
      setFullName("");
      return;
    }
    let active = true;
    void (async () => {
      try {
        const [roles, profile] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", uid),
          supabase.from("profiles").select("full_name").eq("user_id", uid).maybeSingle(),
        ]);
        if (!active) return;
        const list = (roles.data ?? []).map((r) => r.role);
        setRole(list.includes("ADMIN") ? "ADMIN" : "CITIZEN");
        setFullName(profile.data?.full_name ?? "");
      } catch (error) {
        console.error("[Auth] Could not load Supabase profile", error);
        if (!active) return;
        setRole("CITIZEN");
        setFullName("");
      }
    })();
    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  const value = useMemo<AuthState>(
    () => ({
      user: session?.user ?? null,
      session,
      role,
      fullName,
      loading,
      isAdmin: role === "ADMIN",
    }),
    [session, role, fullName, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export async function signOutEverywhere(queryClient: {
  cancelQueries: () => Promise<void>;
  clear: () => void;
}) {
  await queryClient.cancelQueries();
  queryClient.clear();
  await supabase.auth.signOut();
}
