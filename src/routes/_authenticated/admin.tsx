import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Authority-only layout. Every /admin/* route nests under this guard, so a
 * citizen who types an admin URL is redirected before any admin UI renders.
 * Server-side authority is still enforced by Supabase RLS (public.has_role).
 */
export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw redirect({ to: "/admin-login" });

      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);
      if (error) throw error;

      const isAdmin = (roles ?? []).some((r) => r.role === "ADMIN");
      if (!isAdmin) throw redirect({ to: "/dashboard" });
    } catch (error) {
      if (error instanceof Response) throw error;
      if (typeof error === "object" && error !== null && "to" in error) throw error;
      console.error("[Auth] Authority route guard failed", error);
      throw redirect({ to: "/dashboard" });
    }
  },
  component: () => <Outlet />,
});
