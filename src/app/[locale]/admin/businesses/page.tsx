import Link from "next/link";
import { listBusinessConfigs } from "@/lib/agents/configs";
import DeleteBusinessButton from "@/components/admin/DeleteBusinessButton";

export const dynamic = "force-dynamic";

export default async function BusinessesPage() {
  const configs = await listBusinessConfigs();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-hi">Business configs</h1>
          <p className="mt-1 text-sm text-mid">
            Each row is a full set of Ola/Kuba/Marek personas for one client — see docs/agent-templates.md.
          </p>
        </div>
        <Link
          href="businesses/new"
          className="rounded-full bg-ember px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:brightness-110"
        >
          New business
        </Link>
      </div>

      <div className="glass overflow-x-auto rounded-3xl">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-[11px] tracking-[0.15em] text-low uppercase">
              <th className="px-6 py-4 font-bold">Id</th>
              <th className="px-6 py-4 font-bold">Business name</th>
              <th className="px-6 py-4 font-bold">Vertical</th>
              <th className="px-6 py-4 font-bold" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {configs.map((c) => (
              <tr key={c.id}>
                <td className="px-6 py-4 font-mono text-xs text-mid">{c.id}</td>
                <td className="px-6 py-4 font-medium text-hi">{c.businessName}</td>
                <td className="px-6 py-4 text-mid">{c.vertical}</td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`businesses/${c.id}`}
                    className="mr-4 font-semibold text-ember-400 underline-offset-4 hover:underline"
                  >
                    Edit
                  </Link>
                  <DeleteBusinessButton id={c.id} disabled={c.id === "solartech"} />
                </td>
              </tr>
            ))}
            {configs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-low">
                  No businesses yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
