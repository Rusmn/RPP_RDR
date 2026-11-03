export const OUTFITS = {
  Casual: {
    description: "Santai, nyaman, tetap berkarakter.",
    pieces: ["T-shirt", "Chinos", "Sneakers"],
    color: "sage",
  },
  "Smart Casual": {
    description: "Rapi secukupnya, nyaman sepenuhnya.",
    pieces: ["Polo shirt", "Trousers", "Loafers"],
    color: "lavender",
  },
  Formal: {
    description: "Tampil percaya diri di momen penting.",
    pieces: ["Formal shirt", "Dress pants", "Formal shoes"],
    color: "blue",
  },
  "Light Formal": {
    description: "Tetap rapi, lebih ringan untuk hari hangat.",
    pieces: ["Linen shirt", "Lightweight trousers", "Loafers"],
    color: "peach",
  },
};
export const ATTRIBUTES = {
  occasion: { label: "Acara", values: ["Casual", "Semi-Formal", "Formal"] },
  temperature: { label: "Suhu", values: null },
  location: { label: "Lokasi", values: ["Indoor", "Outdoor"] },
  weather: { label: "Cuaca", values: ["Sunny", "Cloudy", "Rainy"] },
};
export const LABELS = {
  Casual: "Casual",
  "Semi-Formal": "Semi-Formal",
  Formal: "Formal",
  Indoor: "Dalam ruangan",
  Outdoor: "Luar ruangan",
  Sunny: "Cerah",
  Cloudy: "Berawan",
  Rainy: "Hujan",
};
export const INITIAL_CASE = {
  occasion: "Casual",
  temperature: 25,
  location: "Indoor",
  weather: "Sunny",
};
export const STORAGE_KEY = "fitcheck.rdr.v1";
export function createInitialKB() {
  return {
    version: 1,
    rules: [
      {
        id: "R0",
        condition: null,
        conclusion: "Casual",
        trueChildId: null,
        falseChildId: null,
        cornerstoneCase: null,
        createdAt: new Date().toISOString(),
      },
    ],
    approvedCases: [],
  };
}
export function validCase(c) {
  return (
    !!c &&
    ATTRIBUTES.occasion.values.includes(c.occasion) &&
    typeof c.temperature === "number" &&
    Number.isFinite(c.temperature) &&
    c.temperature >= 0 &&
    c.temperature <= 45 &&
    ATTRIBUTES.location.values.includes(c.location) &&
    ATTRIBUTES.weather.values.includes(c.weather)
  );
}
export function validCondition(c) {
  if (!c || !ATTRIBUTES[c.attribute]) return false;
  return c.attribute === "temperature"
    ? [">", ">=", "<", "<="].includes(c.operator) &&
        typeof c.value === "number" &&
        Number.isFinite(c.value) &&
        c.value >= 0 &&
        c.value <= 45
    : ["=", "!="].includes(c.operator) &&
        ATTRIBUTES[c.attribute].values.includes(c.value);
}
export function evaluate(condition, c) {
  if (condition === null) return true;
  const a = c[condition.attribute],
    b = condition.value;
  switch (condition.operator) {
    case "=":
      return a === b;
    case "!=":
      return a !== b;
    case ">":
      return a > b;
    case ">=":
      return a >= b;
    case "<":
      return a < b;
    case "<=":
      return a <= b;
    default:
      return false;
  }
}
export function conditionText(c) {
  return c === null
    ? "Selalu benar (TRUE)"
    : `${ATTRIBUTES[c.attribute].label} ${c.operator} ${LABELS[c.value] || c.value}${c.attribute === "temperature" ? "°C" : ""}`;
}
export function infer(kb, c) {
  if (!validCase(c))
    throw new Error(
      "Lengkapi atribut konsumen. Suhu harus berada di antara 0–45°C.",
    );
  const nodes = new Map(kb.rules.map((r) => [r.id, r]));
  let current = nodes.get("R0"),
    conclusion = null,
    lastFiredNode = null,
    terminalNode = null,
    terminalBranch = null;
  const trace = [],
    visited = new Set();
  while (current) {
    if (visited.has(current.id))
      throw new Error("Struktur rule mengandung siklus.");
    visited.add(current.id);
    const matched = evaluate(current.condition, c);
    trace.push({ id: current.id, matched });
    if (matched) {
      conclusion = current.conclusion;
      lastFiredNode = current;
    }
    terminalNode = current;
    terminalBranch = matched ? "trueChildId" : "falseChildId";
    const next = current[terminalBranch];
    if (next && !nodes.has(next))
      throw new Error("Cabang rule tidak ditemukan.");
    current = nodes.get(next);
  }
  if (!lastFiredNode) throw new Error("Rule awal tidak ditemukan.");
  return { conclusion, lastFiredNode, trace, terminalNode, terminalBranch };
}
export function approveCase(kb, c) {
  const result = infer(kb, c),
    next = structuredClone(kb);
  const rule = next.rules.find((r) => r.id === result.lastFiredNode.id);
  if (!rule.cornerstoneCase) rule.cornerstoneCase = { ...c };
  if (
    !next.approvedCases.some(
      (v) =>
        JSON.stringify(v.case) === JSON.stringify(c) &&
        v.conclusion === result.conclusion,
    )
  )
    next.approvedCases.push({
      case: { ...c },
      conclusion: result.conclusion,
      approvedAt: new Date().toISOString(),
    });
  return next;
}
export function suggestedConditions(c, cornerstone) {
  if (!cornerstone) return [];
  return Object.keys(ATTRIBUTES)
    .filter((a) => c[a] !== cornerstone[a])
    .map((attribute) => ({
      attribute,
      operator:
        attribute === "temperature"
          ? c[attribute] > cornerstone[attribute]
            ? ">="
            : "<="
          : "=",
      value: c[attribute],
    }));
}
export function addException(kb, c, conclusion, condition) {
  const result = infer(kb, c),
    cornerstone = result.lastFiredNode.cornerstoneCase;
  if (!OUTFITS[conclusion] || conclusion === result.conclusion)
    throw new Error(
      "Pilih kategori outfit yang berbeda dari rekomendasi saat ini.",
    );
  if (!cornerstone)
    throw new Error(
      `Setujui satu kasus yang mewakili ${result.conclusion} terlebih dahulu untuk menyimpan cornerstone ${result.lastFiredNode.id}.`,
    );
  if (!validCondition(condition))
    throw new Error("Lengkapi kondisi pembeda yang valid.");
  if (!evaluate(condition, c))
    throw new Error(
      "Kondisi harus bernilai TRUE pada kasus baru. Sesuaikan operator atau nilainya.",
    );
  if (evaluate(condition, cornerstone))
    throw new Error(
      "Kondisi juga terpenuhi pada cornerstone. Pilih kondisi lain agar kedua kasus dapat dibedakan.",
    );
  const next = structuredClone(kb),
    parent = next.rules.find((r) => r.id === result.terminalNode.id);
  if (parent[result.terminalBranch])
    throw new Error("Cabang sudah terisi. Jalankan konsultasi kembali.");
  const id = `R${Math.max(...next.rules.map((r) => Number(r.id.slice(1)))) + 1}`;
  const node = {
    id,
    condition: { ...condition },
    conclusion,
    trueChildId: null,
    falseChildId: null,
    cornerstoneCase: { ...c },
    createdAt: new Date().toISOString(),
  };
  next.rules.push(node);
  parent[result.terminalBranch] = id;
  if (
    next.approvedCases.some(
      (v) => infer(next, v.case).conclusion !== v.conclusion,
    )
  )
    throw new Error(
      "Rule ini mengubah hasil kasus yang sudah disetujui. Pilih kondisi pembeda yang lebih sesuai.",
    );
  if (infer(next, c).conclusion !== conclusion)
    throw new Error(
      "Rule belum menghasilkan kesimpulan koreksi. Pilih kondisi pembeda lain.",
    );
  next.approvedCases.push({
    case: { ...c },
    conclusion,
    approvedAt: new Date().toISOString(),
  });
  return next;
}
export function validateKB(kb) {
  if (
    !kb ||
    kb.version !== 1 ||
    !Array.isArray(kb.rules) ||
    !Array.isArray(kb.approvedCases) ||
    !kb.rules.length
  )
    return false;
  const nodes = new Map(kb.rules.map((r) => [r.id, r]));
  if (nodes.size !== kb.rules.length) return false;
  const root = nodes.get("R0");
  if (
    !root ||
    root.condition !== null ||
    root.conclusion !== "Casual" ||
    root.falseChildId !== null
  )
    return false;
  const seen = new Set();
  function visit(id) {
    if (seen.has(id)) return false;
    const r = nodes.get(id);
    if (
      !r ||
      !/^R\d+$/.test(r.id) ||
      !OUTFITS[r.conclusion] ||
      (id !== "R0" &&
        (!validCondition(r.condition) || !validCase(r.cornerstoneCase))) ||
      (r.cornerstoneCase !== null && !validCase(r.cornerstoneCase))
    )
      return false;
    seen.add(id);
    for (const branch of ["trueChildId", "falseChildId"]) {
      if (
        r[branch] !== null &&
        (typeof r[branch] !== "string" || !visit(r[branch]))
      )
        return false;
    }
    return true;
  }
  if (!visit("R0") || seen.size !== nodes.size) return false;
  try {
    return (
      kb.approvedCases.every(
        (v) =>
          validCase(v.case) &&
          OUTFITS[v.conclusion] &&
          infer(kb, v.case).conclusion === v.conclusion,
      ) &&
      kb.rules.every(
        (r) =>
          !r.cornerstoneCase ||
          infer(kb, r.cornerstoneCase).conclusion === r.conclusion,
      )
    );
  } catch {
    return false;
  }
}
export function loadKB(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { kb: createInitialKB(), recovered: false };
    const kb = JSON.parse(raw);
    if (!validateKB(kb)) throw new Error();
    return { kb, recovered: false };
  } catch {
    return { kb: createInitialKB(), recovered: true };
  }
}
export function createDemoKB() {
  let kb = approveCase(createInitialKB(), INITIAL_CASE);
  const formal = { ...INITIAL_CASE, occasion: "Formal" };
  kb = addException(kb, formal, "Formal", {
    attribute: "occasion",
    operator: "=",
    value: "Formal",
  });
  kb = addException(kb, { ...formal, temperature: 33 }, "Light Formal", {
    attribute: "temperature",
    operator: ">=",
    value: 30,
  });
  return addException(
    kb,
    { ...INITIAL_CASE, occasion: "Semi-Formal" },
    "Smart Casual",
    { attribute: "occasion", operator: "=", value: "Semi-Formal" },
  );
}
