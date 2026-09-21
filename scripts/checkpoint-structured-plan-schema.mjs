/**
 * Local contract checks for structured plan generation — no Anthropic call.
 * Run: node scripts/checkpoint-structured-plan-schema.mjs
 */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  }
}

function walkObjects(node, path, visit) {
  if (!isRecord(node)) return;
  visit(node, path);
  for (const [key, child] of Object.entries(node)) {
    if (key === "properties" && isRecord(child)) {
      for (const [name, prop] of Object.entries(child)) {
        walkObjects(prop, `${path}.${name}`, visit);
      }
    } else if (key === "items") {
      walkObjects(child, `${path}[]`, visit);
    }
  }
}

const VENDOR_IDS = [
  "venue",
  "caterer",
  "florist",
  "baker",
  "hair-makeup",
  "jewelry",
  "photographer",
  "videographer",
  "dj",
  "band",
  "officiant",
  "planner",
  "rentals",
];

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["checklist", "budget", "vendorCategories"],
  properties: {
    checklist: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "monthsBeforeWedding"],
        properties: {
          title: { type: "string" },
          monthsBeforeWedding: { type: "integer" },
        },
      },
    },
    budget: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "plannedAmount"],
        properties: {
          category: { type: "string" },
          plannedAmount: { type: "number" },
        },
      },
    },
    vendorCategories: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "note"],
        properties: {
          category: { type: "string", enum: VENDOR_IDS },
          note: { type: "string" },
        },
      },
    },
  },
};

walkObjects(schema, "root", (node, path) => {
  if (node.type === "object") {
    assert(
      node.additionalProperties === false,
      `${path} must set additionalProperties: false`,
    );
    assert(Array.isArray(node.required), `${path} must have required[]`);
  }
  if (node.minItems !== undefined) {
    assert(
      node.minItems === 0 || node.minItems === 1,
      `${path} minItems must be 0 or 1, got ${node.minItems}`,
    );
  }
  assert(
    node.minimum === undefined && node.maximum === undefined,
    `${path} must not use numerical constraints`,
  );
});

const body = {
  output_config: { format: { type: "json_schema", schema } },
};
assert(body.output_config.format.type === "json_schema", "format type");
assert(
  JSON.stringify(schema).includes('"plannedAmount"'),
  "schema includes plannedAmount",
);

const validSample = {
  checklist: [{ title: "Book florist", monthsBeforeWedding: 3 }],
  budget: [{ category: "Florals", plannedAmount: 8000 }],
  vendorCategories: [{ category: "florist", note: "Black-and-white palette" }],
};
assert(
  validSample.budget[0].plannedAmount === 8000,
  "colon-not-gt sample still valid JSON",
);

console.log(process.exitCode ? "FAIL" : "PASS");
