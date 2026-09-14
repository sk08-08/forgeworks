"use server";

import { createHmac } from "node:crypto";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  checkDistributedRateLimit,
  getClientIp,
} from "@/lib/rate-limit";

function validateUsername(username: string): string | null {
  const clean = username.toLowerCase().trim();
  if (clean.length < 3) return "Username must be at least 3 characters";
  if (clean.length > 30) return "Username must be at most 30 characters";
  if (!/^[a-z0-9_-]+$/.test(clean))
    return "Username can only contain letters, numbers, hyphens, and underscores";
  return null;
}

function validatePin(pin: string): string | null {
  if (pin.length !== 4 || !/^\d{4}$/.test(pin))
    return "PIN must be exactly 4 digits";
  return null;
}

function getAuthPepper(): string {
  const pepper = process.env.FORGEWORKS_AUTH_PEPPER;
  if (!pepper || pepper.length < 32) {
    throw new Error("FORGEWORKS_AUTH_PEPPER must be set to a stable 32+ character secret");
  }
  return pepper;
}

function deriveSupabasePassword(username: string, pin: string): string {
  return createHmac("sha256", getAuthPepper())
    .update(`forgeworks-auth-v1:${username}:${pin}`, "utf8")
    .digest("base64url");
}

function legacySupabasePassword(username: string, pin: string): string {
  return `${pin}${username}`;
}

async function setAppSessionCookie(userId: string, username: string) {
  const cookieStore = await cookies();
  cookieStore.set(
    "forgeworks_session",
    JSON.stringify({
      userId,
      username,
      loggedInAt: new Date().toISOString(),
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    },
  );
}

async function clearAppSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("forgeworks_session");
}

async function enforceAuthRateLimit(username: string, scope: string) {
  const requestHeaders = await headers();
  const ip = getClientIp(requestHeaders);

  const [ipCheck, accountCheck] = await Promise.all([
    checkDistributedRateLimit(`auth:${scope}:ip:${ip}`, {
      maxRequests: 30,
      windowMs: 10 * 60_000,
    }),
    checkDistributedRateLimit(`auth:${scope}:account:${username}:ip:${ip}`, {
      maxRequests: 8,
      windowMs: 10 * 60_000,
    }),
  ]);

  return ipCheck.allowed && accountCheck.allowed;
}

async function signInWithPinCredential(
  supabase: Awaited<ReturnType<typeof createClient>>,
  username: string,
  pin: string,
) {
  const email = `${username}@forgeworks.local`;
  const derivedPassword = deriveSupabasePassword(username, pin);

  // New/migrated accounts never expose a reproducible PIN+username password.
  const derivedAttempt = await supabase.auth.signInWithPassword({
    email,
    password: derivedPassword,
  });

  if (derivedAttempt.data?.user && !derivedAttempt.error) {
    return { user: derivedAttempt.data.user, migrated: false };
  }

  // Temporary compatibility path for accounts created before the hardened
  // password derivation. A successful legacy login is migrated immediately.
  const legacyAttempt = await supabase.auth.signInWithPassword({
    email,
    password: legacySupabasePassword(username, pin),
  });

  if (legacyAttempt.error || !legacyAttempt.data?.user) {
    return { user: null, migrated: false };
  }

  const { error: migrationError } = await supabase.auth.updateUser({
    password: derivedPassword,
  });

  if (migrationError) {
    await supabase.auth.signOut({ scope: "local" });
    return { user: null, migrated: false };
  }

  return { user: legacyAttempt.data.user, migrated: true };
}

async function rejectBlockedSession(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_blocked")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.is_blocked !== true) return false;

  await supabase.auth.signOut({ scope: "local" });
  await clearAppSessionCookie();
  return true;
}

export async function loginWithPin(username: string, pin: string) {
  const clean = username.toLowerCase().trim();
  const usernameError = validateUsername(clean);
  if (usernameError) return { success: false, error: usernameError };
  const pinError = validatePin(pin);
  if (pinError) return { success: false, error: pinError };

  try {
    if (!(await enforceAuthRateLimit(clean, "login"))) {
      return {
        success: false,
        error: "Too many attempts. Please wait a few minutes and try again.",
      };
    }

    const supabase = await createClient();
    const result = await signInWithPinCredential(supabase, clean, pin);

    if (!result.user) {
      return { success: false, error: "Incorrect username or PIN" };
    }

    if (await rejectBlockedSession(supabase, result.user.id)) {
      return { success: false, error: "This account has been blocked" };
    }

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("id", result.user.id)
      .maybeSingle();

    if (!existingProfile) {
      await supabase.from("profiles").upsert({
        id: result.user.id,
        username: clean,
        display_name: clean,
      });
    } else if (!existingProfile.username) {
      await supabase
        .from("profiles")
        .update({ username: clean, display_name: clean })
        .eq("id", result.user.id);
    }

    await setAppSessionCookie(result.user.id, clean);
    return { success: true, user: { id: result.user.id, username: clean } };
  } catch (error) {
    console.error("PIN login configuration error:", error);
    return { success: false, error: "Authentication is temporarily unavailable" };
  }
}

export async function checkUsernameAvailability(username: string) {
  const clean = username.toLowerCase().trim();
  const validationError = validateUsername(clean);
  if (validationError) {
    return { available: false, error: validationError, checked: clean };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", clean)
    .maybeSingle();

  if (existing) {
    return {
      available: false,
      error: "This username is already taken",
      checked: clean,
    };
  }

  return { available: true, error: null, checked: clean };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  await clearAppSessionCookie();
  return { success: true };
}

export async function changePin(
  username: string,
  currentPin: string,
  newPin: string,
) {
  const clean = username.toLowerCase().trim();
  const usernameError = validateUsername(clean);
  if (usernameError) return { success: false, error: usernameError };
  const currentPinError = validatePin(currentPin);
  if (currentPinError) return { success: false, error: currentPinError };
  const newPinError = validatePin(newPin);
  if (newPinError) return { success: false, error: newPinError };
  if (currentPin === newPin) {
    return { success: false, error: "New PIN must be different from the current PIN" };
  }

  try {
    if (!(await enforceAuthRateLimit(clean, "change-pin"))) {
      return {
        success: false,
        error: "Too many attempts. Please wait a few minutes and try again.",
      };
    }

    const supabase = await createClient();
    const result = await signInWithPinCredential(supabase, clean, currentPin);

    if (!result.user) {
      return { success: false, error: "Incorrect username or current PIN" };
    }

    if (await rejectBlockedSession(supabase, result.user.id)) {
      return { success: false, error: "This account has been blocked" };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: deriveSupabasePassword(clean, newPin),
    });

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    await setAppSessionCookie(result.user.id, clean);
    return { success: true };
  } catch (error) {
    console.error("PIN change configuration error:", error);
    return { success: false, error: "Authentication is temporarily unavailable" };
  }
}

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, is_blocked")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_blocked) {
    await supabase.auth.signOut({ scope: "local" });
    await clearAppSessionCookie();
    return null;
  }

  const username =
    profile?.username ||
    user.user_metadata?.username ||
    user.email?.split("@")[0] ||
    "user";

  return {
    userId: user.id,
    username,
    loggedInAt: user.last_sign_in_at || user.created_at,
  };
}

export async function registerUser(username: string, pin: string) {
  const clean = username.toLowerCase().trim();
  const usernameError = validateUsername(clean);
  if (usernameError) return { success: false, error: usernameError };
  const pinError = validatePin(pin);
  if (pinError) return { success: false, error: pinError };

  try {
    if (!(await enforceAuthRateLimit(clean, "register"))) {
      return {
        success: false,
        error: "Too many attempts. Please wait a few minutes and try again.",
      };
    }

    const supabase = await createClient();
    const email = `${clean}@forgeworks.local`;

    // Preserve the old UX where entering an existing username + correct PIN
    // signs that account in, while immediately migrating legacy credentials.
    const existing = await signInWithPinCredential(supabase, clean, pin);
    if (existing.user) {
      if (await rejectBlockedSession(supabase, existing.user.id)) {
        return { success: false, error: "This account has been blocked" };
      }

      await setAppSessionCookie(existing.user.id, clean);
      return { success: true, user: { id: existing.user.id, username: clean } };
    }

    const password = deriveSupabasePassword(clean, pin);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: clean, display_name: clean },
      },
    });

    if (signUpError) {
      const msg = signUpError.message || "Error registering user";
      if (msg.toLowerCase().includes("rate")) {
        return {
          success: false,
          error: "Too many attempts. Please wait a moment and try again.",
        };
      }
      if (
        msg.toLowerCase().includes("already") ||
        msg.toLowerCase().includes("exists")
      ) {
        return {
          success: false,
          error:
            "An account with this username already exists. Try a different username or sign in with your PIN.",
        };
      }
      return { success: false, error: msg };
    }

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !signInData?.user) {
      return {
        success: false,
        error:
          signInError?.message ||
          "Account created but failed to start session. Please try signing in.",
      };
    }

    if (await rejectBlockedSession(supabase, signInData.user.id)) {
      return { success: false, error: "This account has been blocked" };
    }

    await setAppSessionCookie(signInData.user.id, clean);
    return {
      success: true,
      user: { id: signInData.user.id, username: clean },
    };
  } catch (error) {
    console.error("Registration configuration error:", error);
    return { success: false, error: "Authentication is temporarily unavailable" };
  }
}
