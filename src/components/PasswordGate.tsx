import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

const SITE_PASSWORD = "FUCKKKKUUU";
const STORAGE_KEY = "site_auth";

export const isAuthenticated = () => {
  return sessionStorage.getItem(STORAGE_KEY) === "true";
};

const PasswordGate = ({ children }: { children: React.ReactNode }) => {
  const [authed, setAuthed] = useState(isAuthenticated());
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === SITE_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      setAuthed(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (authed) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">Enter Password</h1>
          <p className="text-sm text-muted-foreground text-center">This site is password protected.</p>
        </div>
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError(false); }}
          className={error ? "border-destructive" : ""}
          autoFocus
        />
        {error && <p className="text-xs text-destructive">Incorrect password</p>}
        <Button type="submit" className="w-full">Unlock</Button>
      </form>
    </div>
  );
};

export default PasswordGate;
