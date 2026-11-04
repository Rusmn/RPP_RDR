import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  GitBranch,
  Info,
  Layers,
  Minus,
  MousePointer2,
  Play,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  createDemoKB,
  INITIAL_CASE,
  infer,
  conditionText,
} from "../engine/rdr";
import { CaseSummary } from "./CorrectionPanel";
const scenarios = [
  { label: "Hari santai", case: INITIAL_CASE },
  { label: "Acara formal", case: { ...INITIAL_CASE, occasion: "Formal" } },
  {
    label: "Formal saat panas",
    case: { ...INITIAL_CASE, occasion: "Formal", temperature: 33 },
  },
  { label: "Semi-formal", case: { ...INITIAL_CASE, occasion: "Semi-Formal" } },
];
const lessons = [
  {
    title: "Bagaimana RDR mengambil keputusan?",
    text: "Penelusuran dimulai dari R0. Saat kondisi TRUE, kesimpulan diperbarui dan penelusuran mengikuti anak kanan. Saat FALSE, kesimpulan sebelumnya dipertahankan dan penelusuran mengikuti anak kiri. Kesimpulan terakhir yang cocok menjadi hasil akhir.",
  },
  {
    title: "Apa itu cornerstone case?",
    text: "Cornerstone adalah kasus yang mewakili kesimpulan sebuah rule. Rule pengecualian harus cocok dengan kasus baru, tetapi tidak boleh cocok dengan cornerstone dari kesimpulan yang dikoreksi. Pada R0, cornerstone disimpan saat pakar menyetujui kasus pertama.",
  },
  {
    title: "Bagaimana pengetahuan lama dijaga?",
    text: "Setiap rule baru ditempatkan di cabang kosong terakhir tanpa menimpa rule lama. Sistem kemudian menjalankan ulang seluruh kasus yang telah disetujui. Jika ada hasil yang berubah, penambahan rule ditolak.",
  },
];
function RuleTree({
  rules,
  expanded,
  setExpanded,
  selected,
  setSelected,
  trace,
}) {
  const map = new Map(rules.map((r) => [r.id, r]));
  function render(id, branch = null, path = new Set()) {
    const node = map.get(id);
    if (!node || path.has(id)) return null;
    const nextPath = new Set([...path, id]);
    const children = [
      ["FALSE", node.falseChildId],
      ["TRUE", node.trueChildId],
    ].filter(([, id]) => id);
    const open = expanded.has(id),
      visited = trace?.find((t) => t.id === id);
    return (
      <li key={id} className={`tree-item ${branch ? "has-parent" : ""}`}>
        {branch && (
          <span
            className={`branch-label ${branch === "TRUE" ? "true-branch" : "false-branch"}`}
          >
            {branch === "TRUE" ? "Kanan · TRUE" : "Kiri · FALSE"}
          </span>
        )}
        <div
          className={`tree-node ${selected === id ? "is-selected" : ""} ${visited ? "is-visited" : ""}`}
        >
          <button
            className="node-select"
            onClick={() => setSelected(id)}
            title={`Lihat detail ${id}`}
            aria-describedby="tree-interaction-hint"
          >
            <span className="node-top">
              <span className="node-id">{id}</span>
              {id === "R0" ? (
                <span className="node-kind">Rule awal</span>
              ) : (
                <span className="node-kind">Pengecualian</span>
              )}
              {visited && (
                <span
                  className={`node-match ${visited.matched ? "match-true" : "match-false"}`}
                >
                  {visited.matched ? <Check size={12} /> : <Minus size={12} />}
                </span>
              )}
            </span>
            <strong>{node.conclusion}</strong>
            <span className="node-condition">
              {conditionText(node.condition)}
            </span>
          </button>
          {children.length > 0 && (
            <button
              className="expand-node"
              onClick={() =>
                setExpanded((prev) => {
                  const s = new Set(prev);
                  s.has(id) ? s.delete(id) : s.add(id);
                  return s;
                })
              }
              aria-expanded={open}
              aria-label={`${open ? "Tutup cabang" : `Buka ${children.length} cabang`} ${id}`}
            >
              {open ? <Minus size={13} /> : <Plus size={13} />}{" "}
              {open ? "Tutup cabang" : `Buka ${children.length} cabang`}
            </button>
          )}
        </div>
        {children.length > 0 && open && (
          <ul className="tree-children">
            {children.map(([b, child]) => render(child, b, nextPath))}
          </ul>
        )}
      </li>
    );
  }
  return (
    <div className="tree-scroll">
      <ul className="rule-tree">{render("R0")}</ul>
    </div>
  );
}
export default function RDRPage({ kb, lastCase, lastResult }) {
  const demo = useMemo(() => createDemoKB(), []);
  const [mode, setMode] = useState("mine"),
    [expanded, setExpanded] = useState(new Set()),
    [selected, setSelected] = useState(null),
    [scenario, setScenario] = useState(2),
    [step, setStep] = useState(0);
  const activeKB = mode === "demo" ? demo : kb;
  const activeCase =
    mode === "demo" ? scenarios[scenario].case : lastCase || INITIAL_CASE;
  const simulation = infer(activeKB, activeCase);
  const visibleTrace = simulation.trace.slice(0, step);
  const finished = step >= simulation.trace.length;
  const node = activeKB.rules.find((r) => r.id === selected);
  const parent = node
    ? activeKB.rules.find(
        (r) => r.trueChildId === node.id || r.falseChildId === node.id,
      )
    : null;
  function changeMode(next) {
    setMode(next);
    setExpanded(new Set());
    setSelected(null);
    setStep(0);
  }
  function nextStep() {
    const entry = simulation.trace[step];
    if (!entry) return;
    setSelected(entry.id);
    setExpanded(
      (prev) =>
        new Set([...prev, ...simulation.trace.slice(0, step).map((t) => t.id)]),
    );
    setStep(step + 1);
  }
  const latestConclusion = [...visibleTrace].reverse().find((t) => t.matched);
  const latestNode = activeKB.rules.find((r) => r.id === latestConclusion?.id);
  return (
    <div className="rdr-page">
      <section className="rdr-intro">
        <div>
          <h1>
            Di balik setiap
            <br />
            <span>rekomendasi.</span>
          </h1>
          <p>
            Ikuti cara FitCheck berpikir. Buka rule, telusuri keputusan,
            <br className="desktop-break" /> dan lihat pengetahuan tumbuh dari
            koreksi pakar.
          </p>
        </div>
        <div className="rdr-intro-art" aria-hidden="true">
          <div className="mini-node root-mini">
            <GitBranch size={22} />
          </div>
          <div className="mini-line" />
          <div className="mini-node child-mini">
            <Check size={21} />
          </div>
          <div className="mini-node child-mini second-mini">
            <Sparkles size={21} />
          </div>
          <span className="mini-spark">✳</span>
        </div>
      </section>
      <div className="rdr-toolbar">
        <div className="page-tabs" aria-label="Sumber knowledge base">
          <button
            className={mode === "mine" ? "active" : ""}
            onClick={() => changeMode("mine")}
          >
            KB saya <span>{kb.rules.length}</span>
          </button>
          <button
            className={mode === "demo" ? "active" : ""}
            onClick={() => changeMode("demo")}
          >
            <Play size={14} />
            Contoh interaktif
          </button>
        </div>
        <span className="demo-mode-note">
          {mode === "demo" ? (
            <>
              <ShieldCheck size={15} />
              Mode demo · KB kamu tetap aman
            </>
          ) : (
            <>
              <span className="status-dot" />
              Knowledge base di perangkatmu
            </>
          )}
        </span>
      </div>
      <div className="rdr-workspace">
        <section className="card tree-card" aria-labelledby="tree-title">
          <div className="section-heading">
            <div>
              <h2 id="tree-title">Pohon pengetahuan</h2>
              <p id="tree-interaction-hint">
                Klik node untuk melihat ceritanya.
              </p>
            </div>
            <button
              className="button small secondary"
              onClick={() =>
                setExpanded(
                  expanded.size === activeKB.rules.length
                    ? new Set()
                    : new Set(activeKB.rules.map((r) => r.id)),
                )
              }
            >
              {expanded.size === activeKB.rules.length ? (
                <Minus size={14} />
              ) : (
                <Plus size={14} />
              )}
              <span>
                {expanded.size === activeKB.rules.length
                  ? "Tutup semua"
                  : "Buka semua"}
              </span>
            </button>
          </div>
          <div className="tree-canvas">
            <div className="tree-legend">
              <span>
                <i className="green-dot" />
                TRUE · ke kanan
              </span>
              <span>
                <i className="peach-dot" />
                FALSE · ke kiri
              </span>
            </div>
            <RuleTree
              rules={activeKB.rules}
              expanded={expanded}
              setExpanded={setExpanded}
              selected={selected}
              setSelected={setSelected}
              trace={visibleTrace}
            />
            {activeKB.rules.length === 1 && (
              <div className="initial-tree-note">
                <span className="initial-note-line" />
                <p>Setiap pengetahuan dimulai dari satu rule.</p>
                <button onClick={() => changeMode("demo")}>
                  Coba pohon dengan 4 rule <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
          <div className="tree-bottom">
            <span>
              <Layers size={14} />
              {activeKB.rules.length} rule terhubung
            </span>
            <span>
              <MousePointer2 size={14} />
              Buka cabang untuk menjelajah
            </span>
          </div>
        </section>
        <aside className="card node-details" aria-live="polite">
          {node ? (
            <>
              <div className="section-heading">
                <h2>Detail rule</h2>
                <span className="rule-pill">{node.id}</span>
              </div>
              <div
                className={`detail-category category-${node.conclusion.replaceAll(" ", "-").toLowerCase()}`}
              >
                <Sparkles size={24} />
                <h3>{node.conclusion}</h3>
              </div>
              <dl className="rule-properties">
                <div>
                  <dt>Kondisi</dt>
                  <dd>{conditionText(node.condition)}</dd>
                </div>
                <div>
                  <dt>Parent rule</dt>
                  <dd>{parent ? parent.id : "— (root)"}</dd>
                </div>
                <div>
                  <dt>Cabang dari parent</dt>
                  <dd>
                    {parent
                      ? parent.trueChildId === node.id
                        ? "TRUE · kanan"
                        : "FALSE · kiri"
                      : "Titik awal"}
                  </dd>
                </div>
                <div>
                  <dt>Anak kiri (FALSE)</dt>
                  <dd>{node.falseChildId || "Belum ada"}</dd>
                </div>
                <div>
                  <dt>Anak kanan (TRUE)</dt>
                  <dd>{node.trueChildId || "Belum ada"}</dd>
                </div>
              </dl>
              <details className="cornerstone-details">
                <summary>
                  Cornerstone case <ChevronDown size={15} />
                </summary>
                {node.cornerstoneCase ? (
                  <CaseSummary value={node.cornerstoneCase} />
                ) : (
                  <p>
                    Belum tersedia. Setujui kasus pertama yang sesuai dengan
                    rekomendasi ini.
                  </p>
                )}
              </details>
            </>
          ) : (
            <div className="node-placeholder">
              <div>
                <MousePointer2 size={28} />
              </div>
              <h3>Kenali setiap rule.</h3>
              <p>
                Pilih salah satu node untuk membuka kondisi, kesimpulan, dan
                cornerstone-nya.
              </p>
              <span>
                <span className="tiny-rule">R0</span>Mulai dari rule awal
              </span>
            </div>
          )}
        </aside>
      </div>
      <section className="card simulator" aria-labelledby="simulator-title">
        <div className="section-heading">
          <div>
            <h2 id="simulator-title">Telusuri satu keputusan</h2>
            <p>
              Jalankan selangkah demi selangkah. Lihat rule mana yang menentukan
              hasil.
            </p>
          </div>
          <span className="soft-icon">
            <Play size={18} />
          </span>
        </div>
        <div className="simulator-layout">
          <div className="scenario-picker">
            <label className="field" htmlFor="scenario">
              Kasus yang ditelusuri
              {mode === "demo" ? (
                <select
                  id="scenario"
                  value={scenario}
                  onChange={(e) => {
                    setScenario(Number(e.target.value));
                    setStep(0);
                    setSelected(null);
                  }}
                >
                  {scenarios.map((s, i) => (
                    <option key={i} value={i}>
                      {s.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="current-case-label">
                  {lastCase ? "Konsultasi terakhir" : "Contoh kasus awal"}
                </div>
              )}
            </label>
            <CaseSummary value={activeCase} />
            <div className="simulation-actions">
              <button
                className="button primary"
                onClick={nextStep}
                disabled={finished}
              >
                {finished ? <Check size={17} /> : <Play size={15} />}{" "}
                {finished
                  ? "Penelusuran selesai"
                  : step === 0
                    ? "Mulai penelusuran"
                    : "Langkah berikutnya"}
              </button>
              <button
                className="icon-button"
                onClick={() => {
                  setStep(0);
                  setSelected(null);
                }}
                aria-label="Ulangi penelusuran"
              >
                <RotateCcw size={17} />
              </button>
            </div>
          </div>
          <div className="trace-area" aria-live="polite">
            {step === 0 ? (
              <div className="trace-empty">
                <span className="trace-play">
                  <Play size={21} />
                </span>
                <p>
                  Setiap keputusan punya alurnya.
                  <br />
                  <strong>Tekan mulai untuk mengikuti langkah pertama.</strong>
                </p>
              </div>
            ) : (
              <>
                <div className="step-counter">
                  Langkah {step} dari {simulation.trace.length}
                </div>
                <ol className="trace-steps">
                  {visibleTrace.map((t, i) => {
                    const r = activeKB.rules.find((r) => r.id === t.id);
                    return (
                      <li key={t.id}>
                        <span className="trace-number">{i + 1}</span>
                        <div>
                          <strong>
                            {t.id}
                            <span
                              className={
                                t.matched
                                  ? "match-badge true-badge"
                                  : "match-badge false-badge"
                              }
                            >
                              {t.matched ? "TRUE" : "FALSE"}
                            </span>
                          </strong>
                          <p>{conditionText(r.condition)}</p>
                          <span>
                            {t.matched
                              ? `Kesimpulan menjadi ${r.conclusion}.`
                              : "Kesimpulan sebelumnya dipertahankan."}{" "}
                            {!finished || i < visibleTrace.length - 1
                              ? ` Lanjut ke ${t.matched ? "kanan" : "kiri"}.`
                              : " Cabang berikutnya kosong."}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                <div
                  className={`trace-conclusion ${finished ? "finished" : ""}`}
                >
                  <span>
                    {finished ? <Check size={16} /> : <GitBranch size={16} />}{" "}
                    {finished ? "Rekomendasi akhir" : "Kesimpulan sementara"}
                  </span>
                  <strong>{latestNode?.conclusion || "Belum ada"}</strong>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
      <section className="learn-section">
        <div>
          <BookOpen size={21} />
          <h2>Kenalan dengan RDR</h2>
        </div>
        <p>Pengetahuan kecil di balik keputusan yang lebih baik.</p>
        <div className="lesson-list">
          {lessons.map((l, i) => (
            <details key={i}>
              <summary>
                <span>
                  <span className="lesson-number">0{i + 1}</span>
                  {l.title}
                </span>
                <Plus size={18} />
              </summary>
              <p>{l.text}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
