"use client";

export function SignOutButton() {
  return (
    <button
      className="hover:text-white"
      onClick={async () => {
        await fetch("/api/teacher/logout", { method: "POST" });
        window.location.href = "/teacher/login";
      }}
    >
      Sign out
    </button>
  );
}
