import BusinessConfigForm from "@/components/admin/BusinessConfigForm";

export default async function NewBusinessPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold tracking-tight text-hi">New business</h1>
      <BusinessConfigForm locale={locale} initial={null} />
    </div>
  );
}
