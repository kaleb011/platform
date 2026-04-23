type SectionHeadingProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function SectionHeading({
  title,
  description,
  action
}: SectionHeadingProps) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div>
        <h2 className="text-[17px] font-bold tracking-[-0.03em] text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-[12px] text-slate">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
