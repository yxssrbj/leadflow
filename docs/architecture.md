# Architecture

Diagrams of the whole pipeline, from a lead's first contact to a dashboard
update. Renders natively on GitHub and in VS Code's Markdown preview
(Mermaid). For the code layout these diagrams map to, see
[code-structure.md](code-structure.md); for the agent config system, see
[agent-templates.md](agent-templates.md).

## 1. End-to-end pipeline

```mermaid
flowchart LR
    subgraph Sources["Lead sources"]
        WEB["Web form\n(demo UI)"]
        VOICE["Missed call\n(Twilio)"]
        CRM["Dead CRM lead"]
    end

    subgraph Site["web/ — Next.js"]
        DEMO["/[locale]/demo\nchat UI"]
        API["/api/agents/*\nroute handlers"]
        VOICEAPI["/api/voice/*\nTwilio webhooks"]
        CFG["lib/agents/configs\nBusinessConfig"]
        PROMPTS["lib/agents/prompts\n+ tools.ts"]
        CLIENT["lib/anthropic.ts\ngetClient()"]
        DB["lib/db.ts\ndata/db.json"]
        DASH["/[locale]/dashboard\nleads · appointments · quotes"]
    end

    subgraph Providers["Agent providers"]
        MOCK["mock\n(scripted, free)"]
        ANTH["Anthropic API"]
        VERTEX["Vertex AI"]
    end

    WEB --> DEMO --> API
    VOICE --> VOICEAPI
    CRM --> DEMO

    API --> CFG --> PROMPTS
    VOICEAPI --> CFG
    PROMPTS --> API
    API --> CLIENT
    VOICEAPI --> CLIENT
    CLIENT --> MOCK
    CLIENT --> ANTH
    CLIENT --> VERTEX

    API -- "tool call:\nbook_appointment /\ngenerate_quote /\nclose_lead" --> DB
    VOICEAPI --> DB
    DB --> DASH
```

## 2. One chat turn (sequence)

```mermaid
sequenceDiagram
    participant U as Lead (browser)
    participant C as Demo component\n(Client Component)
    participant R as /api/agents/<agent>\n(route handler)
    participant CFG as BusinessConfig +\nprompt/tool builders
    participant AI as Claude client\n(mock / Anthropic / Vertex)
    participant DB as data/db.json

    U->>C: types a reply
    C->>R: POST { history, language, businessId? }
    R->>CFG: getBusinessConfig(businessId)
    CFG-->>R: system prompt + tool schemas
    R->>AI: messages.create(system, tools, messages)
    AI-->>R: reply text (+ optional tool_use)
    alt tool called
        R->>DB: write lead/appointment/quote
        R-->>C: { reply, booking | quote | closed }
        C-->>U: shows reply + result card
    else no tool yet
        R-->>C: { reply }
        C-->>U: shows reply, waits for next turn
    end
```

## 3. Locale & config resolution

```mermaid
flowchart TD
    REQ["Request to any page path"] --> HASLOCALE{"Path already\n/pl/... or /en/... ?"}
    HASLOCALE -- "no" --> PROXY["src/proxy.ts\nreads Accept-Language,\ndefaults to pl"]
    PROXY --> REDIRECT["302 to /pl/... or /en/..."]
    HASLOCALE -- "yes" --> LAYOUT["[locale]/layout.tsx\ngetDictionary(locale)"]
    LAYOUT --> PAGE["Server Component page\nreceives dict as a prop"]
    PAGE --> CLIENTCOMP["Client Components\n(Nav, ChatUI, demo forms)\nreceive dict + locale as props"]
    CLIENTCOMP -- "fetch(..., { language: locale })" --> ROUTE["API route handler"]
    ROUTE --> GETCFG["getBusinessConfig(businessId)\ndefaults to solartech"]
    GETCFG --> BUILD["prompt builder(config, language, ...)\ntools(language)"]
```
