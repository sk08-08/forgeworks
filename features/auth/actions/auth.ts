"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// Shared validation helpers
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

export async function loginWithPin(username: string, pin: string) {
  const clean = username.toLowerCase().trim();

  // Validate inputs
  const usernameError = validateUsername(clean);
  if (usernameError) return { success: false, error: usernameError };
  const pinError = validatePin(pin);
  if (pinError) return { success: false, error: pinError };

  const supabase = await createClient();
  const email = `${clean}@forgeworks.local`;
  const password = `${pin}${clean}`;

  // Sign in via Supabase Auth
  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (signInError || !signInData?.user) {
    return { success: false, error: "Incorrect username or PIN" };
  }

  const authUser = signInData.user;

  // Ensure profile exists (fallback if trigger didn't fire)
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, username, is_blocked")
    .eq("id", authUser.id)
    .maybeSingle();

  if (existingProfile?.is_blocked) {
    return { success: false, error: "This account has been blocked" };
  }

  if (!existingProfile) {
    await supabase.from("profiles").upsert({
      id: authUser.id,
      username: clean,
      display_name: clean,
    });
  } else if (!existingProfile.username) {
    await supabase
      .from("profiles")
      .update({ username: clean, display_name: clean })
      .eq("id", authUser.id);
  }

  // Keep a simple forgeworks_session cookie for app-level info
  const cookieStore = await cookies();
  cookieStore.set(
    "forgeworks_session",
    JSON.stringify({
      userId: authUser.id,
      username: clean,
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

  return { success: true, user: { id: authUser.id, username: clean } };
}

export async function checkUsernameAvailability(username: string) {
  const clean = username.toLowerCase().trim();

  // Validate format first
  const validationError = validateUsername(clean);
  if (validationError) {
    return { available: false, error: validationError, checked: clean };
  }

  const supabase = await createClient();

  // Check if username exists in profiles
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
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete("forgeworks_session");
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
    return {
      success: false,
      error: "New PIN must be different from the current PIN",
    };
  }

  const supabase = await createClient();
  const email = `${clean}@forgeworks.local`;
  const currentPassword = `${currentPin}${clean}`;
  const nextPassword = `${newPin}${clean}`;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_blocked")
    .eq("username", clean)
    .maybeSingle();

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  if (profile?.is_blocked) {
    return { success: false, error: "This account has been blocked" };
  }

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

  if (signInError || !signInData?.user) {
    return { success: false, error: "Incorrect username or current PIN" };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: nextPassword,
  });

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  const cookieStore = await cookies();
  cookieStore.set(
    "forgeworks_session",
    JSON.stringify({
      userId: signInData.user.id,
      username: clean,
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

  return { success: true };
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("forgeworks_session");

  if (!session?.value) {
    return null;
  }

  try {
    return JSON.parse(session.value) as {
      userId: string;
      username: string;
      loggedInAt: string;
    };
  } catch {
    return null;
  }
}

export async function registerUser(username: string, pin: string) {
  // Validate inputs using shared helpers
  const clean = username.toLowerCase().trim();
  const usernameError = validateUsername(clean);
  if (usernameError) return { success: false, error: usernameError };
  const pinError = validatePin(pin);
  if (pinError) return { success: false, error: pinError };

  const supabase = await createClient();
  const email = `${clean}@forgeworks.local`;
  const password = `${pin}${clean}`;

  // Try to sign in first (user may already exist with this PIN)
  const { data: signInExisting, error: signInExistingError } =
    await supabase.auth.signInWithPassword({ email, password });

  if (signInExisting?.user) {
    // User already exists and PIN is correct — sign them in
    const existingUser = signInExisting.user;
    const cookieStore = await cookies();
    cookieStore.set(
      "forgeworks_session",
      JSON.stringify({
        userId: existingUser.id,
        username: clean,
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
    return { success: true, user: { id: existingUser.id, username: clean } };
  }

  // If sign-in failed for reasons other than wrong credentials, surface the error
  if (
    signInExistingError &&
    !signInExistingError.message?.toLowerCase().includes("invalid") &&
    !signInExistingError.message?.toLowerCase().includes("credentials")
  ) {
    return {
      success: false,
      error: signInExistingError.message || "Error checking existing account",
    };
  }

  // Attempt signup for new user
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

  // Immediately sign in after successful signup
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

  const authUser = signInData.user;

  // Set session cookie
  const cookieStore = await cookies();
  cookieStore.set(
    "forgeworks_session",
    JSON.stringify({
      userId: authUser.id,
      username: clean,
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

  return { success: true, user: { id: authUser.id, username: clean } };
}
