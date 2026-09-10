"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Inbox,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  loginWithPin,
  registerUser,
  checkUsernameAvailability,
} from "@/features/auth/actions/auth";
import { FeedbackActions } from "@/features/feedback/components/feedback-actions";
import { cn } from "@/lib/utils";

// ============================================================================
// Username rules
// ============================================================================

interface UsernameRule {
  label: string;
  test: (username: string) => boolean;
}

const usernameRules: UsernameRule[] = [
  {
    label: "3–30 characters",
    test: (username) => username.length >= 3 && username.length <= 30,
  },
  {
    label: "Letters, numbers, hyphens, or underscores",
    test: (username) => /^[a-z0-9_-]*$/.test(username),
  },
  {
    label: "Starts with a letter or number",
    test: (username) => username.length === 0 || /^[a-z0-9]/.test(username),
  },
];

// ============================================================================
// Small visual helpers
// ============================================================================

const workspaceItems = [
  {
    icon: Bot,
    label: "Bot Manager",
    tone: "bg-green-500/10 text-green-500",
  },
  {
    icon: FileText,
    label: "Forms",
    tone: "bg-violet-500/10 text-violet-500",
  },
  {
    icon: Inbox,
    label: "Submissions",
    tone: "bg-blue-500/10 text-blue-500",
  },
  {
    icon: Users,
    label: "Collaboration",
    tone: "bg-emerald-500/10 text-emerald-500",
  },
];

function AuthBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
    >
      <div className="absolute -left-64 -top-56 h-160 w-160 rounded-full bg-purple-500/12 blur-[130px]" />

      <div className="absolute -right-64 top-[20%] h-150 w-150 rounded-full bg-pink-500/8 blur-[140px]" />

      <div className="absolute bottom-[-16rem] left-[40%] h-130 w-130 rounded-full bg-blue-500/7 blur-[130px]" />

      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
    </div>
  );
}

function StatusMessage({ error }: { error: string }) {
  if (!error) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/7 p-3.5"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />

      <p className="text-sm leading-5 text-destructive">{error}</p>
    </div>
  );
}

// ============================================================================
// Page
// ============================================================================

export default function LoginPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // Login
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [showLoginPin, setShowLoginPin] = useState(false);

  // Register
  const [regUsername, setRegUsername] = useState("");
  const [regPin, setRegPin] = useState("");
  const [regPinConfirm, setRegPinConfirm] = useState("");
  const [showRegisterPin, setShowRegisterPin] = useState(false);

  // Username availability
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");

  const [usernameMessage, setUsernameMessage] = useState("");

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastChecked = useRef("");

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  const handlePinInput = (value: string, setter: (value: string) => void) => {
    setter(value.replace(/\D/g, "").slice(0, 4));
  };

  const handleTabChange = (value: string) => {
    const nextTab = value === "register" ? "register" : "login";

    setActiveTab(nextTab);
    setError("");
  };

  // --------------------------------------------------------------------------
  // Username availability
  // --------------------------------------------------------------------------

  const checkUsername = useCallback(async (username: string) => {
    const clean = username.toLowerCase().trim();

    if (!clean) {
      setUsernameStatus("idle");
      setUsernameMessage("");
      return;
    }

    const failedRule = usernameRules.find((rule) => !rule.test(clean));

    if (failedRule) {
      setUsernameStatus("invalid");
      setUsernameMessage(failedRule.label);
      return;
    }

    if (clean === lastChecked.current) return;

    setUsernameStatus("checking");
    setUsernameMessage("Checking availability...");

    try {
      const result = await checkUsernameAvailability(clean);

      lastChecked.current = clean;

      if (result.available) {
        setUsernameStatus("available");
        setUsernameMessage(`@${clean} is available`);
      } else {
        setUsernameStatus("taken");
        setUsernameMessage(result.error || "That username is already taken");
      }
    } catch {
      setUsernameStatus("idle");
      setUsernameMessage("");
    }
  }, []);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    const clean = regUsername.toLowerCase().trim();

    if (clean.length < 3) {
      setUsernameStatus(clean.length > 0 ? "invalid" : "idle");

      if (clean.length > 0) {
        const failedRule = usernameRules.find((rule) => !rule.test(clean));

        setUsernameMessage(
          failedRule?.label || "Username needs at least 3 characters",
        );
      } else {
        setUsernameMessage("");
      }

      lastChecked.current = "";

      return;
    }

    debounceTimer.current = setTimeout(() => {
      void checkUsername(clean);
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [regUsername, checkUsername]);

  // --------------------------------------------------------------------------
  // Submit handlers
  // --------------------------------------------------------------------------

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      const result = await loginWithPin(loginUsername, loginPin);

      if (result.success) {
        router.push("/");
        router.refresh();
        return;
      }

      setError(
        result.error || "Could not sign in. Check your username and PIN.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    const cleanUsername = regUsername.toLowerCase().trim();

    const usernameValid = usernameRules.every((rule) =>
      rule.test(cleanUsername),
    );

    if (!usernameValid) {
      setError("Please choose a username that matches the requirements.");
      return;
    }

    if (regPin !== regPinConfirm) {
      setError("PINs do not match.");
      return;
    }

    if (!/^\d{4}$/.test(regPin)) {
      setError("PIN must contain exactly 4 digits.");
      return;
    }

    if (usernameStatus === "taken") {
      setError("That username is already taken. Please choose another.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await registerUser(cleanUsername, regPin);

      if (result.success) {
        router.push("/");
        router.refresh();
        return;
      }

      setError(result.error || "Could not create the account.");
    } finally {
      setIsLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Register validation state
  // --------------------------------------------------------------------------

  const usernameChecklist =
    regUsername.length > 0
      ? usernameRules.map((rule) => ({
          label: rule.label,
          passed: rule.test(regUsername.toLowerCase().trim()),
        }))
      : [];

  const usernameRulesValid = usernameRules.every((rule) =>
    rule.test(regUsername.toLowerCase().trim()),
  );

  const pinValid = /^\d{4}$/.test(regPin);

  const pinsMatch =
    regPin.length > 0 && regPinConfirm.length > 0 && regPin === regPinConfirm;

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <main className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      <AuthBackground />

      {/* Back */}
      <div className="absolute left-4 top-4 z-30 sm:left-6 sm:top-6">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/65 px-3.5 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur-xl transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back
        </Link>
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl items-center gap-8 px-4 py-20 sm:px-7 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-12">
        {/* ================================================================= */}
        {/* LEFT — Brand / story                                             */}
        {/* ================================================================= */}

        <section className="hidden lg:block">
          <div className="relative max-w-xl">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 shadow-lg shadow-primary/10">
                <Image
                  src="/logo.svg"
                  alt="Forgeworks"
                  width={30}
                  height={30}
                />
              </div>

              <div>
                <p className="text-lg font-bold tracking-tight">Forgeworks</p>

                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Independent creator project · Beta
                </p>
              </div>
            </div>

            <div className="relative">
              <Sparkles className="absolute -right-3 -top-8 h-6 w-6 rotate-12 text-primary/20" />

              <h1 className="text-balance text-5xl font-extrabold leading-[1.04] tracking-[-0.05em] xl:text-6xl">
                Your creator{" "}
                <span className="bg-linear-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  workspace.
                </span>
                <br />
              </h1>

              <p className="mt-6 max-w-lg text-pretty text-lg leading-8 text-muted-foreground">
                Keep your bots, forms, submissions, profiles, collaborations,
                and creator tools together in one place.
              </p>
            </div>

            {/* Tool chips */}
            <div className="mt-9 grid max-w-lg grid-cols-2 gap-3">
              {workspaceItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-2xl border border-border/65 bg-card/55 p-3.5 backdrop-blur"
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl",
                      item.tone,
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </div>

                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Small note */}
            <div className="mt-8 flex max-w-lg items-start gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

              <div>
                <p className="text-xs font-medium">No email required</p>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Forgeworks currently uses a username and 4-digit PIN. The
                  project is free and still in Beta.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* RIGHT — Auth                                                     */}
        {/* ================================================================= */}

        <section className="mx-auto w-full max-w-md">
          {/* Mobile branding */}
          <div className="mb-7 flex flex-col items-center text-center lg:hidden">
            <Link href="/">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 shadow-lg shadow-primary/10">
                <Image
                  src="/logo.svg"
                  alt="Forgeworks"
                  width={34}
                  height={34}
                />
              </div>
            </Link>

            <h1 className="mt-4 text-2xl font-bold tracking-tight">
              Forgeworks
            </h1>

            <p className="mt-1 text-xs text-muted-foreground">
              Free creator workspace · Beta
            </p>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/72 shadow-2xl shadow-black/8 backdrop-blur-xl">
            {/* Top */}
            <div className="border-b border-border/60 px-5 pb-5 pt-6 sm:px-7">
              <div className="mb-5">
                <p className="text-xs font-medium text-primary">
                  Welcome to the Forge
                </p>

                <h2 className="mt-1 text-2xl font-bold tracking-tight">
                  {activeTab === "login"
                    ? "Pick up where you left off."
                    : "Make yourself a workspace."}
                </h2>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {activeTab === "login"
                    ? "Enter the username and PIN connected to your account."
                    : "No email, profile setup, or long onboarding. Username, PIN, done."}
                </p>
              </div>

              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-muted/65 p-1">
                  <TabsTrigger
                    value="login"
                    className="cursor-pointer rounded-lg"
                  >
                    Sign in
                  </TabsTrigger>

                  <TabsTrigger
                    value="register"
                    className="cursor-pointer rounded-lg"
                  >
                    Create account
                  </TabsTrigger>
                </TabsList>

                {/* ======================================================= */}
                {/* LOGIN                                                   */}
                {/* ======================================================= */}

                <TabsContent value="login" className="mt-6">
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="login-username">Username</Label>

                      <div className="relative">
                        <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                        <Input
                          id="login-username"
                          type="text"
                          placeholder="username"
                          value={loginUsername}
                          onChange={(event) =>
                            setLoginUsername(
                              event.target.value.toLowerCase().trim(),
                            )
                          }
                          autoComplete="username"
                          className="h-11 pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-pin">4-digit PIN</Label>

                        <span className="text-[10px] text-muted-foreground">
                          {loginPin.length}/4
                        </span>
                      </div>

                      <div className="relative">
                        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                        <Input
                          id="login-pin"
                          type={showLoginPin ? "text" : "password"}
                          inputMode="numeric"
                          placeholder="••••"
                          value={loginPin}
                          onChange={(event) =>
                            handlePinInput(event.target.value, setLoginPin)
                          }
                          maxLength={4}
                          autoComplete="current-password"
                          className="h-11 pl-10 pr-11 text-center font-mono text-lg tracking-[0.45em]"
                          required
                        />

                        <button
                          type="button"
                          onClick={() => setShowLoginPin((current) => !current)}
                          className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label={showLoginPin ? "Hide PIN" : "Show PIN"}
                        >
                          {showLoginPin ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <StatusMessage error={error} />

                    <Button
                      type="submit"
                      size="lg"
                      className="group h-11 w-full cursor-pointer rounded-xl"
                      disabled={
                        isLoading || !loginUsername || loginPin.length !== 4
                      }
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          Sign in
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </Button>

                    <p className="text-center text-xs text-muted-foreground">
                      New here?{" "}
                      <button
                        type="button"
                        className="cursor-pointer font-medium text-primary transition-opacity hover:opacity-75"
                        onClick={() => handleTabChange("register")}
                      >
                        Create an account
                      </button>
                    </p>
                  </form>
                </TabsContent>

                {/* ======================================================= */}
                {/* REGISTER                                                */}
                {/* ======================================================= */}

                <TabsContent value="register" className="mt-6">
                  <form onSubmit={handleRegister} className="space-y-5">
                    {/* Username */}
                    <div className="space-y-2">
                      <Label htmlFor="reg-username">Choose a username</Label>

                      <div className="relative">
                        <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                        <Input
                          id="reg-username"
                          type="text"
                          placeholder="username"
                          value={regUsername}
                          onChange={(event) =>
                            setRegUsername(
                              event.target.value.toLowerCase().trim(),
                            )
                          }
                          autoComplete="username"
                          className={cn(
                            "h-11 pl-10 pr-11 transition-colors",
                            usernameStatus === "available" &&
                              "border-emerald-500 focus-visible:ring-emerald-500/25",
                            usernameStatus === "taken" &&
                              "border-destructive focus-visible:ring-destructive/25",
                            usernameStatus === "invalid" &&
                              "border-amber-500 focus-visible:ring-amber-500/25",
                          )}
                          required
                        />

                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {usernameStatus === "checking" && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}

                          {usernameStatus === "available" && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          )}

                          {usernameStatus === "taken" && (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}

                          {usernameStatus === "invalid" && (
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                      </div>

                      {usernameMessage && (
                        <p
                          className={cn(
                            "text-xs",
                            usernameStatus === "available" &&
                              "text-emerald-600 dark:text-emerald-400",
                            usernameStatus === "taken" && "text-destructive",
                            usernameStatus === "invalid" &&
                              "text-amber-600 dark:text-amber-400",
                            usernameStatus === "checking" &&
                              "text-muted-foreground",
                          )}
                        >
                          {usernameMessage}
                        </p>
                      )}

                      {usernameChecklist.length > 0 && (
                        <div className="grid gap-1.5 rounded-xl border border-border/60 bg-muted/25 p-3">
                          {usernameChecklist.map((item) => (
                            <div
                              key={item.label}
                              className={cn(
                                "flex items-center gap-2 text-[11px]",
                                item.passed
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-muted-foreground",
                              )}
                            >
                              {item.passed ? (
                                <CheckCircle2 className="h-3 w-3 shrink-0" />
                              ) : (
                                <span className="h-3 w-3 shrink-0 rounded-full border border-muted-foreground/30" />
                              )}

                              {item.label}
                            </div>
                          ))}
                        </div>
                      )}

                      {usernameStatus === "taken" && (
                        <div className="flex items-center gap-3 rounded-xl border border-primary/15 bg-primary/5 p-3">
                          <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                            Is that already your account?
                          </p>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 shrink-0 cursor-pointer"
                            onClick={() => {
                              setLoginUsername(regUsername);
                              handleTabChange("login");
                            }}
                          >
                            Sign in
                            <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* PINs */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="reg-pin">PIN</Label>

                        <div className="relative">
                          <Input
                            id="reg-pin"
                            type={showRegisterPin ? "text" : "password"}
                            inputMode="numeric"
                            placeholder="••••"
                            value={regPin}
                            onChange={(event) =>
                              handlePinInput(event.target.value, setRegPin)
                            }
                            maxLength={4}
                            autoComplete="new-password"
                            className={cn(
                              "h-11 pr-9 text-center font-mono text-lg tracking-[0.35em]",
                              pinValid &&
                                "border-emerald-500 focus-visible:ring-emerald-500/25",
                            )}
                            required
                          />

                          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                            {regPin.length}/4
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="reg-pin-confirm">Confirm PIN</Label>

                        <div className="relative">
                          <Input
                            id="reg-pin-confirm"
                            type={showRegisterPin ? "text" : "password"}
                            inputMode="numeric"
                            placeholder="••••"
                            value={regPinConfirm}
                            onChange={(event) =>
                              handlePinInput(
                                event.target.value,
                                setRegPinConfirm,
                              )
                            }
                            maxLength={4}
                            autoComplete="new-password"
                            className={cn(
                              "h-11 pr-9 text-center font-mono text-lg tracking-[0.35em]",
                              pinsMatch &&
                                "border-emerald-500 focus-visible:ring-emerald-500/25",
                              regPinConfirm.length === 4 &&
                                !pinsMatch &&
                                "border-destructive focus-visible:ring-destructive/25",
                            )}
                            required
                          />

                          {regPinConfirm.length > 0 && (
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                              {pinsMatch ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : regPinConfirm.length === 4 ? (
                                <XCircle className="h-4 w-4 text-destructive" />
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <p className="text-[11px] leading-5 text-muted-foreground">
                        Use exactly 4 digits. Keep this PIN private.
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          setShowRegisterPin((current) => !current)
                        }
                        className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {showRegisterPin ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            Hide
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            Show
                          </>
                        )}
                      </button>
                    </div>

                    <StatusMessage error={error} />

                    <Button
                      type="submit"
                      size="lg"
                      className="group h-11 w-full cursor-pointer rounded-xl"
                      disabled={
                        isLoading ||
                        !regUsername ||
                        !usernameRulesValid ||
                        !pinValid ||
                        !pinsMatch ||
                        usernameStatus === "taken" ||
                        usernameStatus === "checking"
                      }
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        <>
                          Create account
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </Button>

                    <p className="text-center text-xs text-muted-foreground">
                      Already have an account?{" "}
                      <button
                        type="button"
                        className="cursor-pointer font-medium text-primary transition-opacity hover:opacity-75"
                        onClick={() => handleTabChange("login")}
                      >
                        Sign in
                      </button>
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
            </div>

            {/* Footer */}
            <div className="border-t border-border/60 bg-muted/15 px-5 py-4 sm:px-7">
              <div className="flex flex-col items-center justify-between gap-3 text-[11px] text-muted-foreground sm:flex-row">
                <div className="flex items-center gap-3">
                  <Link
                    href="/terms"
                    className="transition-colors hover:text-foreground"
                  >
                    Terms
                  </Link>

                  <Link
                    href="/privacy"
                    className="transition-colors hover:text-foreground"
                  >
                    Privacy
                  </Link>
                </div>

                <span className="inline-flex items-center gap-1.5">Free</span>
              </div>
            </div>
          </div>

          {/* Feedback */}
          <div className="mt-5 flex justify-center">
            <FeedbackActions
              compact
              context={{
                sourcePage: "Login / Register",
                sourceLabel: "Login page",
                sourcePath: "/login",
              }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
