import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ThemeSwitch } from "@/components/theme/theme-switch";

/** Light / Dark choice, shared by the student and teacher settings pages. Saved on this device. */
export function AppearanceSettings() {
  return (
    <Card className="grid gap-5 p-6">
      <div className="grid gap-1">
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Light or dark. This is saved on this device.</CardDescription>
      </div>
      <div className="max-w-xs">
        <ThemeSwitch />
      </div>
    </Card>
  );
}
