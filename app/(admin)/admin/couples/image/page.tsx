import { ImageGeneratorForm } from "@/components/admin/image-generator-form";
import { PageHeader } from "@/components/ui/page-header";

export default function CouplesImagePage() {
  return (
    <div>
      <PageHeader
        className="mb-5"
        title="Image generator — Couples"
        description="Builds a KIE / Seedream 5 Pro prompt packet — you still run it manually, this just writes the prompt."
      />
      <ImageGeneratorForm />
    </div>
  );
}
