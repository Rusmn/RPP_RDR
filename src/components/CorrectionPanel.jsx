import { useState } from "react";
import { ArrowRight, Check, Info, Plus, X } from "lucide-react";
import {
  OUTFITS,
  ATTRIBUTES,
  LABELS,
  suggestedConditions,
  conditionText,
  addException,
} from "../engine/rdr";
export function CaseSummary({ value }) {
  return (
    <div className="case-values">
      <span>{value.occasion}</span>
      <span>{value.temperature}°C</span>
      <span>{LABELS[value.location]}</span>
      <span>{LABELS[value.weather]}</span>
    </div>
  );
}
export default function CorrectionPanel({
  kb,
  consultation,
  result,
  onSave,
  onCancel,
}) {
  const cornerstone = result.lastFiredNode.cornerstoneCase;
  const suggestions = suggestedConditions(consultation, cornerstone);
  const [condition, setCondition] = useState(
    suggestions[0] || {
      attribute: "occasion",
      operator: "=",
      value: consultation.occasion,
    },
  );
  const [conclusion, setConclusion] = useState(
    Object.keys(OUTFITS).find((x) => x !== result.conclusion),
  );
  const [error, setError] = useState("");
  function attributeChange(attribute) {
    setError("");
    setCondition({
      attribute,
      operator: attribute === "temperature" ? ">=" : "=",
      value: consultation[attribute],
    });
  }
  function submit(e) {
    e.preventDefault();
    setError("");
    try {
      onSave(addException(kb, consultation, conclusion, condition));
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <section
      className="correction-panel card"
      aria-labelledby="correction-title"
    >
      <div className="section-heading">
        <div>
          <h2 id="correction-title">Sedikit koreksi, makin mengerti.</h2>
          <p>Ajarkan rekomendasi yang tepat dengan satu kondisi pembeda.</p>
        </div>
        <button
          className="icon-button"
          onClick={onCancel}
          aria-label="Tutup koreksi"
        >
          <X size={20} />
        </button>
      </div>
      {!cornerstone && (
        <div className="notice">
          <Info size={20} />
          <div>
            <strong>Cornerstone belum tersedia</strong>
            <p>
              Opsi di bawah tetap tersedia. Sebelum menyimpan rule, setujui satu
              konsultasi yang memang sesuai dengan {result.conclusion}. Kasus
              itu menjadi pembanding untuk rule {result.lastFiredNode.id};
              setelah itu, konsultasikan lagi kasus yang ingin dikoreksi.
            </p>
          </div>
        </div>
      )}
      <form onSubmit={submit}>
        {cornerstone && (
          <div className="compare-cases">
            <div>
              <h3>Kasus baru</h3>
              <CaseSummary value={consultation} />
            </div>
            <ArrowRight size={20} />
            <div>
              <h3>Cornerstone {result.lastFiredNode.id}</h3>
              <CaseSummary value={cornerstone} />
            </div>
          </div>
        )}
        <label className="field">
          Outfit yang tepat
          <select
            value={conclusion}
            onChange={(e) => setConclusion(e.target.value)}
          >
            {Object.keys(OUTFITS)
              .filter((x) => x !== result.conclusion)
              .map((x) => (
                <option key={x}>{x}</option>
              ))}
          </select>
        </label>
        {suggestions.length > 0 && (
          <div className="suggestions">
            <p>Kondisi pembeda yang disarankan</p>
            <div className="chip-row">
              {suggestions.map((c, i) => (
                <button
                  type="button"
                  className={`suggestion ${JSON.stringify(c) === JSON.stringify(condition) ? "selected" : ""}`}
                  onClick={() => {
                    setCondition(c);
                    setError("");
                  }}
                  key={i}
                >
                  {conditionText(c)}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="condition-fields">
          <label className="field">
            Atribut
            <select
              value={condition.attribute}
              onChange={(e) => attributeChange(e.target.value)}
            >
              {Object.entries(ATTRIBUTES).map(([key, v]) => (
                <option value={key} key={key}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Operator
            <select
              value={condition.operator}
              onChange={(e) =>
                setCondition({ ...condition, operator: e.target.value })
              }
            >
              {(condition.attribute === "temperature"
                ? [">", ">=", "<", "<="]
                : ["=", "!="]
              ).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Nilai
            {condition.attribute === "temperature" ? (
              <input
                type="number"
                min="0"
                max="45"
                step="any"
                required
                value={condition.value}
                onChange={(e) =>
                  setCondition({
                    ...condition,
                    value:
                      e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
              />
            ) : (
              <select
                value={condition.value}
                onChange={(e) =>
                  setCondition({ ...condition, value: e.target.value })
                }
              >
                {ATTRIBUTES[condition.attribute].values.map((v) => (
                  <option value={v} key={v}>
                    {LABELS[v]}
                  </option>
                ))}
              </select>
            )}
          </label>
        </div>
        {cornerstone ? (
          <p className="helper">
            <Check size={15} />
            Kasus yang sudah disetujui akan diperiksa ulang sebelum rule
            disimpan.
          </p>
        ) : null}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            className="button secondary"
            type="button"
            onClick={onCancel}
          >
            Batal
          </button>
          {cornerstone && (
            <button className="button primary" type="submit">
              <Plus size={17} />
              Simpan rule baru
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
