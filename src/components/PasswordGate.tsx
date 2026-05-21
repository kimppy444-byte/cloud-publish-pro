import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import type { Session } from "@supabase/supabase-js";

const ALLOWED_EMAILS = [
  "kimppy444@gmail.com",
  "jessekanhai34@gmail.com",
  "killerkanhai861@gmail.com",
];

export const isAuthenticated = () => {
  // legacy helper — not relied on anymore
  return false;
};

const PasswordGate = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleGoogle = async () => {
    setSigningIn(true);
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError("Sign-in failed. Try again.");
      setSigningIn(false);
      return;
    }
    if (result.redirected) return;
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const email = session?.user?.email?.toLowerCase();
  const authorized = !!email && ALLOWED_EMAILS.includes(email);

  if (session && !authorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center">
            <Lock className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">Access Denied</h1>
          <p className="text-sm text-muted-foreground">
            {email} is not authorized to access this site.
          </p>
          <Button variant="outline" onClick={handleSignOut} className="w-full">
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  if (authorized) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">Admin Sign In</h1>
          <p className="text-sm text-muted-foreground text-center">
            Restricted to authorized administrators only.
          </p>
        </div>
        <Button onClick={handleGoogle} disabled={signingIn} className="w-full">
          {signingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue with Google"}
        </Button>
        {error && <p className="text-xs text-destructive text-center">{error}</p>}
      </div>
    </div>
  );
};

export default PasswordGate;
