import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Alert } from "@/components/ui/alert";

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <Alert variant="destructive">
      <AlertCircle aria-hidden />
      <p>{message}</p>
    </Alert>
  );
}

export function FormNotice({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <Alert variant="success">
      <CheckCircle2 aria-hidden />
      <p>{message}</p>
    </Alert>
  );
}
