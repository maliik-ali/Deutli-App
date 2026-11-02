export function AuthHeading({ title, subtitle }: { title: string; subtitle?: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <h1 className="text-[28px] leading-tight font-extrabold text-foreground sm:text-[32px]">{title}</h1>
      {subtitle && <p className="text-[15px] text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
