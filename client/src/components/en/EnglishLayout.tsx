import { ReactNode, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { EnglishHeader } from "./EnglishHeader";

interface EnglishLayoutProps {
  children: ReactNode;
}

interface User {
  id: string;
  email: string;
  name?: string | null;
  role?: string;
  profileImageUrl?: string | null;
  permissions?: string[];
}

export function EnglishLayout({ children }: EnglishLayoutProps) {
  // Set English page title
  useEffect(() => {
    document.title = "Property ME - Intelligent News Platform";
  }, []);

  // Fetch current user
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return (
    <div className="min-h-screen bg-background" dir="ltr">
      <EnglishHeader user={user} />
      <main>{children}</main>
    </div>
  );
}
