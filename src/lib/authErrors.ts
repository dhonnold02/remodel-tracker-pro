export const friendlyAuthError = (msg: string | undefined | null): string => {
  if (!msg) return "Something went wrong. Please try again.";
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "Incorrect email or password. Please try again.";
  if (
    m.includes("already registered") ||
    m.includes("user already registered") ||
    m.includes("already exists")
  )
    return "An account with this email already exists. Try signing in instead.";
  if (m.includes("password should be at least") || m.includes("password must"))
    return "Password must be at least 6 characters long.";
  if (m.includes("token") || m.includes("expired"))
    return "This reset link is invalid or has expired.";
  return "Something went wrong. Please try again.";
};