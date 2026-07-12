import { notFound } from "next/navigation";
import { getBusinessConfig, isBusinessId } from "@/lib/agents/configs";
import BusinessConfigForm from "@/components/admin/BusinessConfigForm";

export const dynamic = "force-dynamic";

export default async function EditBusinessPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!(await isBusinessId(id))) notFound();
  const config = await getBusinessConfig(id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold tracking-tight text-hi">Edit {config.businessName}</h1>
      <BusinessConfigForm locale={locale} initial={config} />
    </div>
  );
}
