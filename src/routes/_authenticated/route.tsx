import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader email={user.email} />
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
