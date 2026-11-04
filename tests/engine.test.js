import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialKB,
  createDemoKB,
  INITIAL_CASE,
  STORAGE_KEY,
  evaluate,
  infer,
  approveCase,
  addException,
  validateKB,
  loadKB,
  validCase,
} from "../src/engine/rdr.js";
const formal = { ...INITIAL_CASE, occasion: "Formal" };
const condition = { attribute: "occasion", operator: "=", value: "Formal" };
const baseline = () => approveCase(createInitialKB(), INITIAL_CASE);
test("AC-01/02: initial KB contains only TRUE → Casual; cornerstone starts empty", () => {
  const kb = createInitialKB();
  assert.equal(kb.rules.length, 1);
  assert.equal(kb.rules[0].cornerstoneCase, null);
  const r = infer(kb, formal);
  assert.equal(r.conclusion, "Casual");
  assert.deepEqual(r.trace, [{ id: "R0", matched: true }]);
});
test("AC-03: approval stores cornerstone and validation, never adds a rule", () => {
  const kb = baseline();
  assert.equal(kb.rules.length, 1);
  assert.deepEqual(kb.rules[0].cornerstoneCase, INITIAL_CASE);
  assert.equal(kb.approvedCases.length, 1);
  assert.equal(approveCase(kb, INITIAL_CASE).approvedCases.length, 1);
});
test("Cornerstone approval required before first exception", () => {
  assert.throws(
    () => addException(createInitialKB(), formal, "Formal", condition),
    /Setujui satu kasus/,
  );
});
test("AC-05/14: valid correction appends exception and reruns to expert conclusion", () => {
  const original = baseline(),
    kb = addException(original, formal, "Formal", condition);
  assert.equal(original.rules.length, 1);
  assert.equal(kb.rules[0].trueChildId, "R1");
  assert.equal(infer(kb, formal).conclusion, "Formal");
  assert.equal(kb.approvedCases.length, 2);
  assert.ok(validateKB(kb));
});
test("AC-06: reject conditions that match cornerstone or miss new case", () => {
  assert.throws(
    () =>
      addException(baseline(), formal, "Formal", {
        attribute: "location",
        operator: "=",
        value: "Indoor",
      }),
    /cornerstone/,
  );
  assert.throws(
    () =>
      addException(baseline(), formal, "Formal", {
        attribute: "occasion",
        operator: "=",
        value: "Semi-Formal",
      }),
    /TRUE/,
  );
});
test("AC-07/08/09/12: all PRD scenarios and numeric exception return correct last conclusion", () => {
  const kb = createDemoKB();
  assert.equal(kb.rules.length, 4);
  assert.ok(validateKB(kb));
  for (const [c, expected] of [
    [INITIAL_CASE, "Casual"],
    [formal, "Formal"],
    [{ ...formal, temperature: 33 }, "Light Formal"],
    [{ ...INITIAL_CASE, occasion: "Semi-Formal" }, "Smart Casual"],
  ])
    assert.equal(infer(kb, c).conclusion, expected);
  assert.equal(kb.rules[1].trueChildId, "R2");
  assert.equal(kb.rules[1].falseChildId, "R3");
  assert.deepEqual(
    infer(kb, { ...INITIAL_CASE, occasion: "Semi-Formal" }).trace,
    [
      { id: "R0", matched: true },
      { id: "R1", matched: false },
      { id: "R3", matched: true },
    ],
  );
  assert.equal(infer(kb, formal).lastFiredNode.id, "R1");
});
test("Acquisition attaches to terminal empty branch, not blindly to last fired node", () => {
  const kb = createDemoKB();
  const c = { ...INITIAL_CASE, temperature: 20, location: "Outdoor" };
  const r = infer(kb, c);
  assert.equal(r.lastFiredNode.id, "R0");
  assert.equal(r.terminalNode.id, "R3");
  const next = addException(kb, c, "Smart Casual", {
    attribute: "location",
    operator: "=",
    value: "Outdoor",
  });
  assert.equal(next.rules.find((r) => r.id === "R3").falseChildId, "R4");
  assert.ok(validateKB(next));
});
test("AC-13: reject regression on approved cases and leave KB untouched", () => {
  let kb = addException(baseline(), formal, "Formal", condition);
  kb = approveCase(kb, {
    ...INITIAL_CASE,
    temperature: 33,
    location: "Outdoor",
  });
  const before = JSON.stringify(kb);
  assert.throws(
    () =>
      addException(
        kb,
        { ...INITIAL_CASE, occasion: "Semi-Formal", temperature: 33 },
        "Smart Casual",
        { attribute: "temperature", operator: ">=", value: 30 },
      ),
    /sudah disetujui/,
  );
  assert.equal(JSON.stringify(kb), before);
});
test("All six operators and temperature boundaries work", () => {
  for (const [operator, value, result] of [
    ["=", 25, true],
    ["!=", 25, false],
    [">", 24, true],
    [">=", 25, true],
    ["<", 26, true],
    ["<=", 25, true],
  ])
    assert.equal(
      evaluate({ attribute: "temperature", operator, value }, INITIAL_CASE),
      result,
    );
  assert.ok(validCase({ ...INITIAL_CASE, temperature: 0 }));
  assert.ok(validCase({ ...INITIAL_CASE, temperature: 45 }));
  for (const value of [-1, 46, NaN, Infinity, "25", null])
    assert.equal(validCase({ ...INITIAL_CASE, temperature: value }), false);
  assert.throws(
    () => infer(baseline(), { ...INITIAL_CASE, temperature: 46 }),
    /0–45/,
  );
});
test("Invalid conclusion and malformed condition are rejected", () => {
  assert.throws(
    () => addException(baseline(), formal, "Unknown", condition),
    /kategori/,
  );
  assert.throws(
    () => addException(baseline(), formal, "Casual", condition),
    /berbeda/,
  );
  assert.throws(
    () =>
      addException(baseline(), formal, "Formal", {
        attribute: "temperature",
        operator: "=",
        value: 25,
      }),
    /valid/,
  );
});
test("AC-10/11: serialize, reload, reset", () => {
  const kb = createDemoKB();
  let value = JSON.stringify(kb);
  const storage = { getItem: () => value };
  assert.deepEqual(loadKB(storage).kb, kb);
  value = JSON.stringify(createInitialKB());
  assert.equal(loadKB(storage).kb.rules.length, 1);
  assert.equal(STORAGE_KEY, "fitcheck.rdr.v1");
});
test("Empty, corrupt, unavailable, and malformed storage recover safely", () => {
  for (const raw of [
    null,
    "{bad",
    "null",
    "{}",
    '{"version":1,"rules":[],"approvedCases":[]}',
  ]) {
    const loaded = loadKB({ getItem: () => raw });
    assert.equal(loaded.kb.rules.length, 1);
    assert.equal(loaded.recovered, raw !== null);
  }
  assert.equal(
    loadKB({
      getItem: () => {
        throw Error("disabled");
      },
    }).recovered,
    true,
  );
});
test("Reject cycles, dangling children, duplicate IDs, extra parent, orphan, malformed root, corrupt cornerstone", () => {
  const changes = [
    (kb) => (kb.rules[0].trueChildId = "R0"),
    (kb) => (kb.rules[0].trueChildId = "R99"),
    (kb) => kb.rules.push({ ...kb.rules[1] }),
    (kb) => (kb.rules[2].trueChildId = "R3"),
    (kb) => (kb.rules[1].falseChildId = null),
    (kb) => (kb.rules[0].condition = condition),
    (kb) => (kb.rules[1].cornerstoneCase.temperature = 100),
  ];
  for (const change of changes) {
    const kb = createDemoKB();
    change(kb);
    assert.equal(validateKB(kb), false);
  }
});
test("Inference deterministic and all approved cases remain valid after every addition", () => {
  const kb = createDemoKB();
  assert.deepEqual(infer(kb, formal), infer(kb, formal));
  kb.approvedCases.forEach((v) =>
    assert.equal(infer(kb, v.case).conclusion, v.conclusion),
  );
});
