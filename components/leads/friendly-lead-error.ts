export function friendlyLeadError(message: string) {
  if (
    /permission denied|row-level security|violates|postgrest|postgres|pgrst|jwt/i.test(
      message,
    )
  ) {
    return "Something went wrong. Please try again.";
  }
  return message;
}
