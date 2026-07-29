import { useEffect, useState, type FormEvent } from "react";
import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import {
  Pizza,
  ShoppingCart,
  Flame,
  PackageCheck,
  Settings as SettingsIcon,
  Sandwich,
  LogOut,
  Menu,
  Maximize,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { KDS_AUTH_KEY, verifyKdsCredentials } from "@/lib/kds-auth";
import { useSettings } from "@/hooks/use-kds-data";
import type { SystemMode } from "@/lib/kds-types";
import herSalinLogoUrl from "@/assets/her-salin-logo.png";

export const Route = createFileRoute("/_kds")({
  component: KdsLayout,
});

const FULLSCREEN_DISMISSED_KEY = "hersalin_fullscreen_dismissed_v1";
const KDS_HEADER_COLLAPSED_KEY = "hersalin_header_collapsed_v1";

type FullscreenDocument = Document & { webkitFullscreenElement?: Element | null };
type FullscreenRoot = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};
type StandaloneNavigator = Navigator & { standalone?: boolean };

function isKdsStandalone() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as StandaloneNavigator).standalone)
  );
}

function hasKdsFullscreenElement() {
  if (typeof document === "undefined") return false;

  const fullscreenDocument = document as FullscreenDocument;
  return Boolean(document.fullscreenElement || fullscreenDocument.webkitFullscreenElement);
}

function getFullscreenRequest() {
  if (typeof document === "undefined") return null;

  const root = document.documentElement as FullscreenRoot;
  const request = root.requestFullscreen ?? root.webkitRequestFullscreen;
  return request ? { root, request } : null;
}

function canUseKdsFullscreen() {
  if (typeof window === "undefined") return false;

  const isTouchDevice =
    window.matchMedia("(pointer: coarse)").matches ||
    window.innerWidth <= 1024;

  return Boolean(getFullscreenRequest() && isTouchDevice && !isKdsStandalone());
}

async function requestKdsFullscreen() {
  if (!canUseKdsFullscreen() || hasKdsFullscreenElement()) return;

  const fullscreenRequest = getFullscreenRequest();
  if (!fullscreenRequest) return;

  await Promise.resolve(fullscreenRequest.request.call(fullscreenRequest.root));
}

function KdsLayout() {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setAuthed(localStorage.getItem(KDS_AUTH_KEY) === "1");
    } catch {}
    setReady(true);
  }, []);

  if (!ready) return null;

  if (!authed) {
    return <LoginScreen onSuccess={() => setAuthed(true)} />;
  }

  const logout = () => {
    try { localStorage.removeItem(KDS_AUTH_KEY); } catch {}
    setAuthed(false);
  };

  return <AuthenticatedKdsLayout logout={logout} />;
}

function AuthenticatedKdsLayout({ logout }: { logout: () => void }) {
  const settings = useSettings();
  const mode = settings?.system_mode ?? "test";
  const [headerCollapsed, setHeaderCollapsed] = useState(true);

  useEffect(() => {
    try {
      const storedPreference = localStorage.getItem(KDS_HEADER_COLLAPSED_KEY);
      setHeaderCollapsed(storedPreference === null ? true : storedPreference === "1");
    } catch {}
  }, []);

  const toggleHeaderCollapsed = () => {
    setHeaderCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(KDS_HEADER_COLLAPSED_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <FullscreenPrompt />
      <header className="sticky top-0 z-30 border-b bg-card shadow-sm">
        <div className={`flex items-center gap-2 ${headerCollapsed ? "min-h-10 px-2 py-1" : "px-4 py-1"}`}>
          {headerCollapsed ? (
            <CollapsedHeader mode={mode} logout={logout} onExpand={toggleHeaderCollapsed} />
          ) : (
            <>
              <Link
                to="/"
                aria-label="Retour à l’accueil"
                title="Retour à l’accueil"
                className="group mr-2 inline-flex min-h-16 shrink-0 items-center rounded-xl px-1.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:bg-accent/80 sm:mr-4"
              >
                <KdsHeaderLogo />
              </Link>
              <SystemModeBadge mode={mode} />
              <DesktopNav logout={logout} />
              <MobileNav logout={logout} />
              <HeaderCollapseButton collapsed={false} onToggle={toggleHeaderCollapsed} />
            </>
          )}
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

function KdsHeaderLogo({ className = "w-[8.5rem] sm:w-[9.5rem] lg:w-[10rem]" }: { className?: string }) {
  return (
    <img
      src={herSalinLogoUrl}
      alt=""
      aria-hidden="true"
      className={`h-auto max-w-none rounded-lg object-contain ${className}`}
      draggable={false}
    />
  );
}

function CollapsedHeader({
  mode,
  logout,
  onExpand,
}: {
  mode: SystemMode;
  logout: () => void;
  onExpand: () => void;
}) {
  return (
    <>
      <Link
        to="/"
        aria-label="Retour à l’accueil"
        title="Retour à l’accueil"
        className="inline-flex h-8 shrink-0 items-center rounded-lg px-1 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:bg-accent/80"
      >
        <KdsHeaderLogo className="max-h-8 w-[5.25rem] sm:w-[5.75rem]" />
      </Link>
      <SystemModeMiniBadge mode={mode} />
      <CompactNav logout={logout} />
      <HeaderCollapseButton collapsed onToggle={onExpand} />
    </>
  );
}

function SystemModeBadge({ mode }: { mode: SystemMode }) {
  const label =
    mode === "learning" ? "MODE APPRENTISSAGE" : mode === "normal" ? "MODE NORMAL" : "MODE TEST";
  const className =
    mode === "learning"
      ? "border-blue-300 bg-blue-50 text-blue-700"
      : mode === "normal"
        ? "border-secondary/40 bg-secondary/10 text-secondary"
        : "border-primary/40 bg-primary/10 text-primary";

  return (
    <span className={`inline-flex shrink-0 rounded-full border px-2 py-1 text-[9px] font-black tracking-wide sm:px-2.5 sm:text-[10px] ${className}`}>
      {label}
    </span>
  );
}

function SystemModeMiniBadge({ mode }: { mode: SystemMode }) {
  const label = mode === "learning" ? "APP" : mode === "normal" ? "NORMAL" : "TEST";
  const className =
    mode === "learning"
      ? "border-blue-300 bg-blue-50 text-blue-700"
      : mode === "normal"
        ? "border-secondary/40 bg-secondary/10 text-secondary"
        : "border-primary/40 bg-primary/10 text-primary";

  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black tracking-wide ${className}`}
      title={mode === "learning" ? "Mode apprentissage" : mode === "normal" ? "Mode normal" : "Mode test"}
    >
      {label}
    </span>
  );
}

function HeaderCollapseButton({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      aria-label={collapsed ? "Déployer le bandeau" : "Replier le bandeau"}
      title={collapsed ? "Déployer le bandeau" : "Replier le bandeau"}
    >
      {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      <span className="hidden md:inline">{collapsed ? "Déployer" : "Replier"}</span>
    </button>
  );
}

function FullscreenPrompt() {
  const [visible, setVisible] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const canFullscreen = canUseKdsFullscreen();
    const alreadyDismissed = (() => {
      try {
        return localStorage.getItem(FULLSCREEN_DISMISSED_KEY) === "1";
      } catch {
        return false;
      }
    })();

    setSupported(canFullscreen);
    setVisible(canFullscreen && !alreadyDismissed && !hasKdsFullscreenElement());
  }, []);

  useEffect(() => {
    if (!supported) return;

    const enterOnFirstGesture = () => {
      if (!hasKdsFullscreenElement()) {
        requestKdsFullscreen().catch(() => setVisible(true));
      }
      window.removeEventListener("pointerdown", enterOnFirstGesture);
      window.removeEventListener("touchstart", enterOnFirstGesture);
    };

    window.addEventListener("pointerdown", enterOnFirstGesture, { once: true });
    window.addEventListener("touchstart", enterOnFirstGesture, { once: true });

    return () => {
      window.removeEventListener("pointerdown", enterOnFirstGesture);
      window.removeEventListener("touchstart", enterOnFirstGesture);
    };
  }, [supported]);

  useEffect(() => {
    const onFullscreenChange = () => setVisible(supported && !hasKdsFullscreenElement());
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
    };
  }, [supported]);

  const enterFullscreen = async () => {
    try {
      await requestKdsFullscreen();
      setVisible(false);
    } catch {
      setVisible(true);
    }
  };

  const dismiss = () => {
    try {
      localStorage.setItem(FULLSCREEN_DISMISSED_KEY, "1");
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border bg-card p-3 shadow-xl sm:left-auto sm:w-80">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Maximize className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-bold">Mode plein écran</div>
          <p className="text-xs text-muted-foreground">
            Recommandé sur tablette et mobile pour éviter les barres du navigateur pendant le service.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={enterFullscreen}
              className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
            >
              Activer
            </button>
            <button
              onClick={dismiss}
              className="rounded-md border px-3 py-2 text-xs font-bold text-muted-foreground"
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (verifyKdsCredentials(user, pass)) {
      requestKdsFullscreen().catch(() => {});
      try { localStorage.setItem(KDS_AUTH_KEY, "1"); } catch {}
      setError("");
      onSuccess();
    } else {
      setError("Identifiant ou mot de passe incorrect.");
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="mb-2 flex flex-col items-center gap-2 text-center">
          <KdsHeaderLogo className="w-[15rem] sm:w-[16rem]" />
          <p className="text-xs font-medium text-muted-foreground">Accès restreint au KDS</p>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Identifiant</label>
          <input
            type="text"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            autoFocus
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Mot de passe</label>
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Se connecter
        </button>
      </form>
    </div>
  );
}

function NavLink({
  to,
  children,
  icon,
}: {
  to: string;
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
    >
      {icon}
      {children}
    </Link>
  );
}

function DesktopNav({ logout }: { logout: () => void }) {
  return (
    <div className="hidden sm:flex items-center gap-2 flex-1">
      <nav className="flex flex-wrap items-center gap-1">
        <NavLink to="/caisse" icon={<ShoppingCart className="h-4 w-4" />}>Caisse</NavLink>
        <NavLink to="/assistant" icon={<BrainCircuit className="h-4 w-4" />}>Assistant</NavLink>
        <NavLink to="/pizzaiolo" icon={<Pizza className="h-4 w-4" />}>Pizzaiolo</NavLink>
        <NavLink to="/four" icon={<Flame className="h-4 w-4" />}>Four</NavLink>
        <NavLink to="/panino" icon={<Sandwich className="h-4 w-4" />}>Pani'NO</NavLink>
        <NavLink to="/pretes" icon={<PackageCheck className="h-4 w-4" />}>Prêtes</NavLink>
        <NavLink to="/reglages" icon={<SettingsIcon className="h-4 w-4" />}>Réglages</NavLink>
      </nav>
      <button
        onClick={logout}
        className="ml-auto inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        title="Se déconnecter"
      >
        <LogOut className="h-4 w-4" />
        Déconnexion
      </button>
    </div>
  );
}

function CompactNav({ logout }: { logout: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="ml-auto flex items-center">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-4 w-4" />
            Menu
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-3/4 sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 mt-6">
            <MobileNavLink to="/caisse" icon={<ShoppingCart className="h-5 w-5" />} setOpen={setOpen}>Caisse</MobileNavLink>
            <MobileNavLink to="/assistant" icon={<BrainCircuit className="h-5 w-5" />} setOpen={setOpen}>Assistant</MobileNavLink>
            <MobileNavLink to="/pizzaiolo" icon={<Pizza className="h-5 w-5" />} setOpen={setOpen}>Pizzaiolo</MobileNavLink>
            <MobileNavLink to="/four" icon={<Flame className="h-5 w-5" />} setOpen={setOpen}>Four</MobileNavLink>
            <MobileNavLink to="/panino" icon={<Sandwich className="h-5 w-5" />} setOpen={setOpen}>Pani'NO</MobileNavLink>
            <MobileNavLink to="/pretes" icon={<PackageCheck className="h-5 w-5" />} setOpen={setOpen}>Prêtes</MobileNavLink>
            <MobileNavLink to="/reglages" icon={<SettingsIcon className="h-5 w-5" />} setOpen={setOpen}>Réglages</MobileNavLink>
          </nav>
          <button
            onClick={() => { setOpen(false); logout(); }}
            className="mt-4 inline-flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="h-5 w-5" />
            Déconnexion
          </button>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MobileNav({ logout }: { logout: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex sm:hidden items-center gap-2 ml-auto">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-3/4 sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 mt-6">
            <MobileNavLink to="/caisse" icon={<ShoppingCart className="h-5 w-5" />} setOpen={setOpen}>Caisse</MobileNavLink>
            <MobileNavLink to="/assistant" icon={<BrainCircuit className="h-5 w-5" />} setOpen={setOpen}>Assistant</MobileNavLink>
            <MobileNavLink to="/pizzaiolo" icon={<Pizza className="h-5 w-5" />} setOpen={setOpen}>Pizzaiolo</MobileNavLink>
            <MobileNavLink to="/four" icon={<Flame className="h-5 w-5" />} setOpen={setOpen}>Four</MobileNavLink>
            <MobileNavLink to="/panino" icon={<Sandwich className="h-5 w-5" />} setOpen={setOpen}>Pani'NO</MobileNavLink>
            <MobileNavLink to="/pretes" icon={<PackageCheck className="h-5 w-5" />} setOpen={setOpen}>Prêtes</MobileNavLink>
            <MobileNavLink to="/reglages" icon={<SettingsIcon className="h-5 w-5" />} setOpen={setOpen}>Réglages</MobileNavLink>
          </nav>
          <button
            onClick={() => { setOpen(false); logout(); }}
            className="mt-4 inline-flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="h-5 w-5" />
            Déconnexion
          </button>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MobileNavLink({
  to,
  children,
  icon,
  setOpen,
}: {
  to: string;
  children: React.ReactNode;
  icon: React.ReactNode;
  setOpen: (v: boolean) => void;
}) {
  return (
    <Link
      to={to}
      onClick={() => setOpen(false)}
      className="inline-flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
    >
      {icon}
      {children}
    </Link>
  );
}
