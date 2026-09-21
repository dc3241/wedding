/**
 * Local mock of the parse-retry contract in callClaudeForWeddingPlan.
 * Does not hit Anthropic — verifies retry-on-SyntaxError / no-retry-on-HTTP.
 */
function stripJsonFences(raw) {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

const MAX_PARSE_ATTEMPTS = 3;

async function runWithFetch(fetchImpl) {
  const logs = [];
  let returned = null;

  for (let attempt = 1; attempt <= MAX_PARSE_ATTEMPTS; attempt++) {
    const response = await fetchImpl(attempt);
    if (!response.ok) {
      logs.push({ kind: "http", attempt, status: response.status });
      returned = null;
      break;
    }
    const data = await response.json();
    const raw = data.content?.find((b) => b.type === "text")?.text;
    if (!raw) {
      logs.push({ kind: "no_text", attempt });
      returned = null;
      break;
    }
    const stripped = stripJsonFences(raw);
    try {
      JSON.parse(stripped);
      logs.push({ kind: "ok", attempt });
      returned = { ok: true, attempt };
      break;
    } catch (error) {
      if (error instanceof SyntaxError) {
        const match = /position (\d+)/i.exec(error.message);
        const offset = match ? Number(match[1]) : 0;
        logs.push({
          kind: "json_parse",
          attempt,
          offset,
          window: stripped.slice(Math.max(0, offset - 200), offset + 200),
        });
        if (attempt < MAX_PARSE_ATTEMPTS) continue;
        returned = null;
        break;
      }
      throw error;
    }
  }
  return { returned, logs };
}

const bad = {
  ok: true,
  json: async () => ({
    content: [
      {
        type: "text",
        text: '{"checklist":[{"title":"x","monthsBeforeWedding":1}],"budget":[{"category":"Florals","plannedAmount">8000}],"vendorCategories":[]}',
      },
    ],
  }),
};

const good = {
  ok: true,
  json: async () => ({
    content: [
      {
        type: "text",
        text: '{"checklist":[{"title":"x","monthsBeforeWedding":1}],"budget":[{"category":"Florals","plannedAmount":8000}],"vendorCategories":[]}',
      },
    ],
  }),
};

const http401 = { ok: false, status: 401, json: async () => ({}) };

{
  const { returned, logs } = await runWithFetch(async (attempt) =>
    attempt === 1 ? bad : good,
  );
  console.log("case: fail then ok", { returned, logs });
  if (!(returned?.ok && returned.attempt === 2 && logs[0].kind === "json_parse")) {
    process.exitCode = 1;
  }
}

{
  const { returned, logs } = await runWithFetch(async () => bad);
  console.log("case: three parse fails", { returned, logs });
  if (
    !(
      returned === null &&
      logs.length === 3 &&
      logs.every((l) => l.kind === "json_parse")
    )
  ) {
    process.exitCode = 1;
  }
}

{
  const { returned, logs } = await runWithFetch(async () => http401);
  console.log("case: http 401 no retry", { returned, logs });
  if (!(returned === null && logs.length === 1 && logs[0].kind === "http")) {
    process.exitCode = 1;
  }
}

console.log(process.exitCode ? "FAIL" : "PASS");
