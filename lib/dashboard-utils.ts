export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12)  return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}

export function splitName(fullName: string): { first: string; last: string } {
  const trimmed = fullName.trim();
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex === -1) return { first: trimmed, last: "" };
  return {
    first: trimmed.slice(0, spaceIndex),
    last: trimmed.slice(spaceIndex + 1),
  };
}

export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}
