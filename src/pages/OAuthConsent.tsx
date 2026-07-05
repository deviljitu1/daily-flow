import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";

type AuthClient = {
  auth: {
    oauth?: {
      getAuthorizationDetails: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
      approveAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
      denyAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
    };
  };
};

const oauth = () => (supabase as unknown as AuthClient).auth.oauth!;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("No redirect returned by the authorization server.");
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-6 space-y-3">
          <h1 className="text-xl font-semibold">Authorization error</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </Card>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  const clientName = details.client?.name ?? "This app";

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-muted/20">
      <Card className="max-w-md w-full p-8 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-semibold">Connect {clientName}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {clientName} is requesting access to use GetWeb Task as you. It will be able to read and modify your tasks,
          time sessions, and other app data your account can access.
        </p>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
            Deny
          </Button>
          <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
          </Button>
        </div>
      </Card>
    </main>
  );
}
