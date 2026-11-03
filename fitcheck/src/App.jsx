import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronDown,
  Cloud,
  CloudRain,
  Database,
  GitBranch,
  Haze,
  Info,
  Leaf,
  MapPin,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sun,
  Thermometer,
  X,
} from "lucide-react";
import {
  OUTFITS,
  INITIAL_CASE,
  LABELS,
  STORAGE_KEY,
  createInitialKB,
  infer,
  approveCase,
  loadKB,
} from "./engine/rdr";
import OutfitArt from "./components/OutfitArt";
import CorrectionPanel, { CaseSummary } from "./components/CorrectionPanel";
import RDRPage from "./components/RDRPage";

function Logo() {
  return (
    <span className="brand">
      <span className="brand-icon">
        <svg
          width="24"
          height="24"
          viewBox="0 0 32 32"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M13 10a3 3 0 1 1 4.5 2.6v2.3l9 5.6c1 .6.6 2.5-.6 2.5H6c-1.4 0-1.8-1.8-.6-2.5L16 14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      FitCheck<span className="brand-dot">.</span>
    </span>
  );
}
export default function App() {
  const [loaded] = useState(() => loadKB(window.localStorage));
  const [kb, setKB] = useState(loaded.kb);
  const [page, setPage] = useState(
    location.hash === "#rdr" ? "rdr" : "consultation",
  );
  const [form, setForm] = useState({ ...INITIAL_CASE });
  const [consultation, setConsultation] = useState(null),
    [result, setResult] = useState(null);
  const [approved, setApproved] = useState(false),
    [correction, setCorrection] = useState(false);
  const [message, setMessage] = useState(
    loaded.recovered
      ? "Data tersimpan rusak atau tidak valid. Knowledge base dikembalikan ke R0."
      : "",
  );
  const [storageError, setStorageError] = useState(""),
    [formError, setFormError] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const correctionRef = useRef(null),
    modalRef = useRef(null),
    resetRef = useRef(null);
  useEffect(() => {
    const handler = () =>
      setPage(location.hash === "#rdr" ? "rdr" : "consultation");
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 5500);
      return () => clearTimeout(timer);
    }
  }, [message]);
  useEffect(() => {
    if (correction)
      correctionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }, [correction]);
  useEffect(() => {
    if (resetOpen) {
      modalRef.current?.focus();
      return () => resetRef.current?.focus({ preventScroll: true });
    }
  }, [resetOpen]);
  function navigate(p) {
    location.hash = p === "rdr" ? "rdr" : "consultation";
    setPage(p);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function save(next) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setStorageError("");
    } catch {
      setStorageError(
        "Penyimpanan perangkat tidak tersedia. Perubahan hanya tersimpan selama tab ini terbuka.",
      );
    }
    setKB(next);
  }
  function submit(e) {
    e.preventDefault();
    try {
      const c = {
        ...form,
        temperature: form.temperature === "" ? NaN : Number(form.temperature),
      };
      setResult(infer(kb, c));
      setConsultation(c);
      setApproved(false);
      setCorrection(false);
      setFormError("");
    } catch (e) {
      setFormError(e.message);
    }
  }
  function approve() {
    save(approveCase(kb, consultation));
    setApproved(true);
    setMessage("Rekomendasi disetujui. Kasus validasi berhasil disimpan.");
  }
  function corrected(next) {
    save(next);
    setResult(infer(next, consultation));
    setCorrection(false);
    setApproved(true);
    setMessage("Rule baru tersimpan. Rekomendasi sudah diperbarui.");
  }
  function reset() {
    save(createInitialKB());
    setResult(null);
    setConsultation(null);
    setApproved(false);
    setCorrection(false);
    setResetOpen(false);
    setMessage("Knowledge base direset. Mulai lagi dari R0.");
  }
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a
            href="#consultation"
            className="logo-link"
            onClick={(e) => {
              e.preventDefault();
              navigate("consultation");
            }}
            aria-label="FitCheck beranda"
          >
            <Logo />
          </a>
          <nav aria-label="Navigasi utama">
            <a
              className={page === "consultation" ? "active" : ""}
              href="#consultation"
              onClick={() => navigate("consultation")}
            >
              <Sparkles size={16} />
              Konsultasi
            </a>
            <a
              className={page === "rdr" ? "active" : ""}
              href="#rdr"
              onClick={() => navigate("rdr")}
            >
              <GitBranch size={16} />
              Eksplorasi RDR
            </a>
          </nav>
          <span className="local-status">
            <span />
            Tersimpan di perangkat
          </span>
        </div>
      </header>
      {storageError && (
        <div className="storage-warning" role="alert">
          {storageError}
        </div>
      )}
      <main className="main-container">
        {page === "consultation" ? (
          <>
            <section className="hero">
              <div className="hero-copy">
                <h1>
                  Outfit pas.
                  <br />
                  <span>Apa pun agendanya.</span>
                </h1>
                <p>
                  Kenali kebutuhannya, temukan gayanya.
                  <br />
                  Rekomendasi outfit yang terus belajar dari keahlianmu.
                </p>
                <a
                  href="#consultation-form"
                  className="text-link"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById("occasion").focus();
                  }}
                >
                  Mulai konsultasi <ArrowDown size={16} />
                </a>
              </div>
              <div className="hero-visual">
                <div className="hero-circle" />
                <OutfitArt hero />
                <span className="style-note">
                  <Sparkles size={14} />A little style, a better day.
                </span>
                <span className="float-tag">
                  <Check size={14} />
                  Comfort meets confidence
                </span>
              </div>
            </section>
            <div className="workspace-heading">
              <div>
                <h2>Ruang konsultasi</h2>
                <p>Satu langkah kecil menuju outfit yang tepat.</p>
              </div>
              <div className="kb-count">
                <span className="little-icon">
                  <GitBranch size={16} />
                </span>
                <span className="count-value">
                  <strong>{kb.rules.length}</strong> rule aktif
                </span>
                <span className="count-divider" />
                <span className="count-value">
                  <strong>{kb.approvedCases.length}</strong> kasus disetujui
                </span>
              </div>
            </div>
            <div className="consultation-grid">
              <section
                className="card consultation-card"
                aria-labelledby="form-title"
              >
                <div className="section-heading">
                  <h3 id="form-title">Ceritakan agendanya</h3>
                  <span className="soft-icon">
                    <Sparkles size={19} />
                  </span>
                </div>
                <p className="section-description">
                  Empat detail untuk menemukan paduan yang sesuai.
                </p>
                <form id="consultation-form" onSubmit={submit}>
                  <div className="form-grid">
                    <label className="field" htmlFor="occasion">
                      Acara
                      <select
                        id="occasion"
                        value={form.occasion}
                        onChange={(e) =>
                          setForm({ ...form, occasion: e.target.value })
                        }
                      >
                        <option value="Casual">Casual</option>
                        <option value="Semi-Formal">Semi-Formal</option>
                        <option value="Formal">Formal</option>
                      </select>
                    </label>
                    <label className="field" htmlFor="temperature">
                      Suhu udara
                      <div className="input-with-unit">
                        <Thermometer size={17} />
                        <input
                          id="temperature"
                          type="number"
                          min="0"
                          max="45"
                          step="any"
                          required
                          value={form.temperature}
                          onChange={(e) =>
                            setForm({ ...form, temperature: e.target.value })
                          }
                        />
                        <span>°C</span>
                      </div>
                      <span className="field-hint">Rentang 0–45°C</span>
                    </label>
                    <fieldset className="location-field">
                      <legend>Lokasi</legend>
                      <div className="segmented">
                        {["Indoor", "Outdoor"].map((v) => (
                          <label
                            className={form.location === v ? "selected" : ""}
                            key={v}
                          >
                            <input
                              type="radio"
                              name="location"
                              value={v}
                              checked={form.location === v}
                              onChange={() => setForm({ ...form, location: v })}
                            />
                            {v === "Indoor" ? (
                              <Haze size={17} />
                            ) : (
                              <Leaf size={17} />
                            )}
                            <span>{LABELS[v]}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <fieldset className="weather-field">
                      <legend>Cuaca</legend>
                      <div className="weather-options">
                        {[
                          ["Sunny", Sun],
                          ["Cloudy", Cloud],
                          ["Rainy", CloudRain],
                        ].map(([v, Icon]) => (
                          <label
                            key={v}
                            className={form.weather === v ? "selected" : ""}
                          >
                            <input
                              type="radio"
                              name="weather"
                              value={v}
                              checked={form.weather === v}
                              onChange={() => setForm({ ...form, weather: v })}
                            />
                            <Icon size={22} />
                            {LABELS[v]}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </div>
                  {formError && (
                    <p role="alert" className="error-message">
                      {formError}
                    </p>
                  )}
                  <button
                    className="button primary recommend-button"
                    type="submit"
                  >
                    Temukan outfit <ArrowRight size={18} />
                  </button>
                  <p className="privacy-note">
                    <ShieldCheck size={14} />
                    Diproses langsung di perangkatmu, tanpa data keluar.
                  </p>
                </form>
              </section>
              <section
                className={`card recommendation-card ${result ? "has-result" : ""}`}
                aria-labelledby="recommendation-title"
                aria-live="polite"
              >
                <div className="section-heading">
                  <h3 id="recommendation-title">Pilihan untukmu</h3>
                  {result ? (
                    <span className="rule-pill">
                      <GitBranch size={13} />
                      {result.lastFiredNode.id}
                    </span>
                  ) : (
                    <span className="soft-icon">
                      <CheckCheck size={19} />
                    </span>
                  )}
                </div>
                {result ? (
                  <>
                    <div
                      className={`result-art ${OUTFITS[result.conclusion].color}`}
                    >
                      <OutfitArt category={result.conclusion} />
                      <span className="result-art-caption">
                        The everyday edit
                      </span>
                    </div>
                    <div className="result-heading">
                      <h2>{result.conclusion}</h2>
                      <span className="result-star">
                        <Sparkles size={20} />
                      </span>
                    </div>
                    <p className="result-description">
                      {OUTFITS[result.conclusion].description}
                    </p>
                    <div className="outfit-pieces">
                      {OUTFITS[result.conclusion].pieces.map((p) => (
                        <span key={p}>{p}</span>
                      ))}
                    </div>
                    <details className="result-context">
                      <summary>
                        Detail kasus & jalur rule <ChevronDown size={14} />
                      </summary>
                      <CaseSummary value={consultation} />
                      <p className="trace-inline">
                        {result.trace.map((t, i) => (
                          <span key={t.id}>
                            {i > 0 && <ArrowRight size={12} />}
                            <b>{t.id}</b>
                            <span
                              className={t.matched ? "true-text" : "false-text"}
                            >
                              {t.matched ? "TRUE" : "FALSE"}
                            </span>
                          </span>
                        ))}
                      </p>
                    </details>
                    {approved ? (
                      <div className="approved-state">
                        <CheckCheck size={18} />
                        Disetujui & tersimpan
                      </div>
                    ) : (
                      <div className="recommendation-actions">
                        <button
                          className="button secondary"
                          onClick={() => setCorrection(true)}
                        >
                          Koreksi
                        </button>
                        <button className="button dark" onClick={approve}>
                          <Check size={17} />
                          Setujui
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="empty-result">
                    <div className="empty-art">
                      <OutfitArt />
                    </div>
                    <h4>Gayamu dimulai dari sini.</h4>
                    <p>
                      Isi detail di samping, lalu temukan
                      <br />
                      rekomendasi untuk agendanya.
                    </p>
                    <span className="empty-caption">
                      <span />
                      Menunggu detail konsultasi
                    </span>
                  </div>
                )}
              </section>
            </div>
            {correction && (
              <div ref={correctionRef} className="correction-anchor">
                <CorrectionPanel
                  kb={kb}
                  consultation={consultation}
                  result={result}
                  onSave={corrected}
                  onCancel={() => setCorrection(false)}
                />
              </div>
            )}
            <button className="rdr-invitation" onClick={() => navigate("rdr")}>
              <span className="invitation-icon">
                <GitBranch size={23} />
              </span>
              <span>
                <strong>Setiap rekomendasi punya cerita.</strong>
                <span>
                  Lihat bagaimana pengetahuan tumbuh, satu rule demi satu rule.
                </span>
              </span>
              <span className="invitation-link">
                Jelajahi RDR <ArrowUpRight size={18} />
              </span>
            </button>
          </>
        ) : (
          <RDRPage kb={kb} lastCase={consultation} lastResult={result} />
        )}
        <footer>
          <span>
            FitCheck<span className="brand-dot">.</span>
            <span className="footer-caption">
              Good style. Thoughtful decisions.
            </span>
          </span>
          <button ref={resetRef} onClick={() => setResetOpen(true)}>
            <RotateCcw size={14} />
            Reset knowledge base
          </button>
        </footer>
      </main>
      {message && (
        <div className="toast" role="status">
          <Check size={18} />
          {message}
          <button onClick={() => setMessage("")} aria-label="Tutup notifikasi">
            <X size={16} />
          </button>
        </div>
      )}
      {resetOpen && (
        <div className="modal-backdrop" onClick={() => setResetOpen(false)}>
          <div
            className="modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
            ref={modalRef}
            onKeyDown={(e) => {
              if (e.key === "Escape") setResetOpen(false);
              if (e.key === "Tab") {
                const items = e.currentTarget.querySelectorAll("button");
                const first = items[0],
                  last = items[items.length - 1];
                if (
                  e.shiftKey &&
                  (document.activeElement === first ||
                    document.activeElement === e.currentTarget)
                ) {
                  e.preventDefault();
                  last.focus();
                } else if (
                  !e.shiftKey &&
                  (document.activeElement === last ||
                    document.activeElement === e.currentTarget)
                ) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            <span className="modal-icon">
              <RotateCcw size={24} />
            </span>
            <h2 id="reset-title">Mulai dari awal?</h2>
            <p>
              Seluruh rule tambahan dan kasus validasi akan dihapus dari
              perangkat ini. Knowledge base kembali ke satu rule awal, R0.
            </p>
            <div className="form-actions">
              <button
                className="button secondary"
                onClick={() => setResetOpen(false)}
              >
                Batal
              </button>
              <button className="button primary" onClick={reset}>
                Ya, reset KB
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
