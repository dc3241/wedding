import { Eyebrow } from "@/components/ui/eyebrow";
import { Card } from "@/components/ui/card";

export function WorkspacePlaceholder({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <Card className="px-6 py-12 text-center">
      <Eyebrow className="mb-2 block">{title}</Eyebrow>
      <p className="text-sm text-ink-muted">
        {description ?? "This section is coming soon."}
      </p>
    </Card>
  );
}
