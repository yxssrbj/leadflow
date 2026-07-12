import { saveBusinessConfig } from "@/app/[locale]/admin/businesses/actions";
import type { BusinessConfig } from "@/lib/agents/types";

// Shared create/edit form for BusinessConfig — see docs/agent-templates.md
// for what each field controls. Deliberately plain, uncontrolled HTML
// inputs posting straight to the saveBusinessConfig Server Action: this is
// an internal tool, not the customer-facing demo, so it doesn't need the
// same interaction polish.
export default function BusinessConfigForm({
  locale,
  initial,
}: {
  locale: string;
  initial: BusinessConfig | null;
}) {
  const isNew = initial === null;

  return (
    <form action={saveBusinessConfig} className="glass flex flex-col gap-5 rounded-3xl p-7">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="isNew" value={String(isNew)} />

      <Field label="Id (lowercase-with-hyphens, used in ?business=<id>)">
        <input
          name="id"
          required
          pattern="[a-z0-9-]+"
          defaultValue={initial?.id}
          readOnly={!isNew}
          className={`field w-full ${!isNew ? "opacity-60" : ""}`}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Business name">
          <input name="businessName" required defaultValue={initial?.businessName} className="field w-full" />
        </Field>
        <Field label="City">
          <input name="city" required defaultValue={initial?.city} className="field w-full" />
        </Field>
      </div>

      <Field label="Vertical (English, meta-instruction only — e.g. 'photovoltaic and heat pump installer')">
        <input name="vertical" required defaultValue={initial?.vertical} className="field w-full" />
      </Field>

      <Field label="Services (English, one sentence)">
        <textarea name="services" required rows={2} defaultValue={initial?.services} className="field w-full resize-none" />
      </Field>

      <Field label="Appointment label (e.g. 'free on-site audit (bezpłatny audyt)')">
        <input name="appointmentLabel" required defaultValue={initial?.appointmentLabel} className="field w-full" />
      </Field>

      <Field label="Qualifying questions — one per line, English">
        <textarea
          name="qualifyingQuestions"
          required
          rows={4}
          defaultValue={initial?.qualifyingQuestions.join("\n")}
          className="field w-full resize-none"
        />
      </Field>

      <Field label="Subsidy / incentive note (English, optional — leave blank to skip)">
        <textarea name="subsidyNote" rows={2} defaultValue={initial?.subsidyNote} className="field w-full resize-none" />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Pricing guide — Polish (copied into real quotes)">
          <textarea
            name="pricingGuidePl"
            required
            rows={8}
            defaultValue={initial?.pricingGuide.pl}
            className="field w-full resize-none font-mono text-xs"
          />
        </Field>
        <Field label="Pricing guide — English (copied into real quotes)">
          <textarea
            name="pricingGuideEn"
            required
            rows={8}
            defaultValue={initial?.pricingGuide.en}
            className="field w-full resize-none font-mono text-xs"
          />
        </Field>
      </div>

      <div>
        <p className="mb-3 text-xs font-bold tracking-[0.15em] text-low uppercase">Agent personas</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <PersonaFields
            legend="Speed-to-lead"
            prefix="agent_speedToLead"
            persona={initial?.agents.speedToLead}
          />
          <PersonaFields legend="Quotation" prefix="agent_quotation" persona={initial?.agents.quotation} />
          <PersonaFields legend="Outbound" prefix="agent_outbound" persona={initial?.agents.outbound} />
        </div>
      </div>

      <button
        type="submit"
        className="mt-2 w-fit rounded-full bg-ember px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:brightness-110"
      >
        {isNew ? "Create business" : "Save changes"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-mid">{label}</span>
      {children}
    </label>
  );
}

function PersonaFields({
  legend,
  prefix,
  persona,
}: {
  legend: string;
  prefix: string;
  persona?: { name: string; role: string };
}) {
  return (
    <fieldset className="flex flex-col gap-2 rounded-2xl border border-line p-3">
      <legend className="px-1 text-xs font-semibold text-hi">{legend}</legend>
      <input
        name={`${prefix}_name`}
        required
        placeholder="Name (e.g. Ola)"
        defaultValue={persona?.name}
        className="field w-full"
      />
      <input
        name={`${prefix}_role`}
        required
        placeholder="Role (English, e.g. intake agent)"
        defaultValue={persona?.role}
        className="field w-full"
      />
    </fieldset>
  );
}
