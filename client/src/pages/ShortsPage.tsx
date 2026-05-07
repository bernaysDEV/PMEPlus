import { useEffect } from "react";
import ShortsFeed from "@/components/ShortsFeed";

export default function ShortsPage() {
  // Hide body overflow when component mounts
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  return <ShortsFeed />;
}
