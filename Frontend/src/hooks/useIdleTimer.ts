// hooks/useIdleTimer.ts
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useIdleTimer(timeoutMinutes: number = 15) {
  const router = useRouter();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Clear session on inactivity timeout
        localStorage.removeItem("access_token");
        router.push("/login?reason=idle");
      }, timeoutMinutes * 60 * 1000);
    };

    // User activity listeners
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("click", resetTimer);

    resetTimer(); // Initialize timer

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("click", resetTimer);
    };
  }, [router, timeoutMinutes]);
}