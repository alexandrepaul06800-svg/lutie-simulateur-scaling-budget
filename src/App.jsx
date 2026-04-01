import { useState, useRef, useMemo, useEffect } from "react"
import Lottie from "lottie-react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from "chart.js"
import { Line } from "react-chartjs-2"
import "./index.css"
import "./App.css"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, ChartTooltip, Legend, Filler)

// ─── Coefficients de dégradation par secteur ──────────────────────────────────
const SECTEURS = [
  "E-commerce mode / textile",
  "E-commerce beauté / cosmétique",
  "E-commerce maison / déco",
  "E-commerce alimentaire",
  "E-commerce sport",
  "Services B2B",
  "SaaS",
  "Formation",
  "Immobilier",
  "Santé / Bien-être",
  "Retail généraliste",
]

const TYPES_CAMPAGNE = ["Shopping", "Search", "Performance Max"]

// Coefficient multiplicateur sur la dégradation par type de campagne
const COEFF_CAMPAGNE = { Shopping: 1.0, Search: 0.8, "Performance Max": 1.3 }

// Taux de dégradation de base par doublement de budget (réaliste)
const DEGRAD_REALISTE = { opt: 0.08, real: 0.28, pess: 0.48 }

// ─── Tooltip ──────────────────────────────────────────────────────────────────
function TooltipUI({ text }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="tooltip-wrapper">
      <button
        className="tooltip-trigger"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label="Aide"
      >?</button>
      {open && <span className="tooltip-box">{text}</span>}
    </span>
  )
}

// ─── NumInput ─────────────────────────────────────────────────────────────────
function NumInput({ label, hint, tooltip, suffix, placeholder, value, onChange, error, step }) {
  return (
    <div className="input-group">
      <label className="input-label">
        {label}
        {tooltip && <TooltipUI text={tooltip} />}
      </label>
      {hint && <span className="input-hint">{hint}</span>}
      <div className="input-with-suffix">
        <input
          type="number"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          min="0"
          step={step || "1"}
        />
        {suffix && <span className="input-suffix">{suffix}</span>}
      </div>
      {error && <span className="error-msg">{error}</span>}
    </div>
  )
}

// ─── SelectInput ──────────────────────────────────────────────────────────────
function SelectInput({ label, options, value, onChange }) {
  return (
    <div className="input-group">
      <label className="input-label">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

// ─── LottieBtn ────────────────────────────────────────────────────────────────
function LottieBtn({ href, children }) {
  const lottieRef1 = useRef(null)
  const lottieRef2 = useRef(null)
  const [animData, setAnimData] = useState(null)

  useEffect(() => {
    fetch("/lottie-btn.json").then(r => r.json()).then(setAnimData).catch(() => {})
  }, [])

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="btn btn--primary lottie-btn"
      onMouseEnter={() => { lottieRef1.current?.play(); lottieRef2.current?.play() }}
      onMouseLeave={() => { lottieRef1.current?.stop(); lottieRef2.current?.stop() }}
    >
      {animData && <Lottie lottieRef={lottieRef1} animationData={animData} autoplay={false} loop={false} style={{ width: 40, height: 40 }} />}
      <span>{children}</span>
      {animData && <Lottie lottieRef={lottieRef2} animationData={animData} autoplay={false} loop={false} style={{ width: 40, height: 40, transform: "scaleX(-1)" }} />}
    </a>
  )
}

// ─── Formule projection ───────────────────────────────────────────────────────
function projeterROAS(budgetActuel, budgetCible, roasActuel, tauxDegrad) {
  if (budgetActuel <= 0 || budgetCible <= 0 || roasActuel <= 0) return null
  const facteur = budgetCible / budgetActuel
  const nbDoublements = Math.log(facteur) / Math.log(2)
  return roasActuel * Math.pow(1 - tauxDegrad, nbDoublements)
}

function genererCourbe(budgetActuel, budgetCible, roasActuel, tauxDegrad, nbPoints = 20) {
  const points = []
  for (let i = 0; i <= nbPoints; i++) {
    const budget = budgetActuel + (budgetCible - budgetActuel) * (i / nbPoints)
    const roas = projeterROAS(budgetActuel, budget, roasActuel, tauxDegrad)
    points.push({ budget: Math.round(budget), roas: roas ? Math.max(0, roas) : 0 })
  }
  return points
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [budgetActuel, setBudgetActuel] = useState("")
  const [roasActuel, setRoasActuel] = useState("")
  const [budgetCible, setBudgetCible] = useState("")
  const [marge, setMarge] = useState("")
  const [showAffiner, setShowAffiner] = useState(false)
  const [secteur, setSecteur] = useState(SECTEURS[0])
  const [typeCampagne, setTypeCampagne] = useState(TYPES_CAMPAGNE[0])

  // Validation
  const hasCore = budgetActuel && roasActuel && budgetCible
  const errBudget = budgetCible && budgetActuel && Number(budgetCible) === Number(budgetActuel)
    ? "Le budget cible doit être différent du budget actuel." : null
  const errROAS = roasActuel && Number(roasActuel) < 1
    ? "⚠️ Ton ROAS actuel est inférieur à 1 — tes campagnes sont déjà en déficit." : null

  // Coefficients affinés
  const coeffCamp = COEFF_CAMPAGNE[typeCampagne] || 1.0
  const tauxOpt = DEGRAD_REALISTE.opt * coeffCamp
  const tauxReal = DEGRAD_REALISTE.real * coeffCamp
  const tauxPess = DEGRAD_REALISTE.pess * coeffCamp

  // Projections
  const scenarios = useMemo(() => {
    if (!hasCore) return null
    const ba = Number(budgetActuel)
    const bc = Number(budgetCible)
    const ra = Number(roasActuel)
    const m = marge ? Number(marge) / 100 : null

    const roasOpt = projeterROAS(ba, bc, ra, tauxOpt)
    const roasReal = projeterROAS(ba, bc, ra, tauxReal)
    const roapPess = projeterROAS(ba, bc, ra, tauxPess)

    const calc = (roas) => {
      if (!roas) return null
      const ca = bc * roas
      const margeNette = m ? ca * m - bc : null
      return { roas: Math.max(0, roas), ca, margeNette }
    }

    return {
      opt: calc(roasOpt),
      real: calc(roasReal),
      pess: calc(roapPess),
    }
  }, [budgetActuel, budgetCible, roasActuel, tauxOpt, tauxReal, tauxPess, marge])

  // ROAS seuil de rentabilité (danger zone)
  const roasSeuil = marge && Number(marge) > 0 && Number(marge) < 100
    ? 1 / (Number(marge) / 100)
    : null

  // Courbes Chart.js
  const chartData = useMemo(() => {
    if (!hasCore) return null
    const ba = Number(budgetActuel)
    const bc = Number(budgetCible)
    const ra = Number(roasActuel)
    const seuil = marge && Number(marge) > 0 && Number(marge) < 100
      ? 1 / (Number(marge) / 100)
      : null

    const cOpt = genererCourbe(ba, bc, ra, tauxOpt)
    const cReal = genererCourbe(ba, bc, ra, tauxReal)
    const cPess = genererCourbe(ba, bc, ra, tauxPess)

    const labels = cReal.map(p => `${(p.budget / 1000).toFixed(1)}k€`)
    const nbPoints = labels.length

    const datasets = [
      {
        label: "Optimiste",
        data: cOpt.map(p => p.roas.toFixed(2)),
        borderColor: "#10b981",
        backgroundColor: "rgba(16,185,129,0.05)",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.4,
      },
      {
        label: "Réaliste",
        data: cReal.map(p => p.roas.toFixed(2)),
        borderColor: "#fcb800",
        backgroundColor: "rgba(252,184,0,0.07)",
        borderWidth: 2.5,
        pointRadius: 0,
        tension: 0.4,
      },
      {
        label: "Pessimiste",
        data: cPess.map(p => p.roas.toFixed(2)),
        borderColor: "#a19aff",
        backgroundColor: "rgba(161,154,255,0.07)",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.4,
      },
    ]

    if (seuil) {
      datasets.push({
        label: `ROAS seuil (${seuil.toFixed(2)})`,
        data: Array(nbPoints).fill(seuil.toFixed(2)),
        borderColor: "#ef4444",
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderDash: [6, 4],
        pointRadius: 0,
        tension: 0,
      })
    }

    return { labels, datasets }
  }, [budgetActuel, budgetCible, roasActuel, tauxOpt, tauxReal, tauxPess, marge])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
          color: "#495057",
          boxWidth: 12,
          padding: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: ctx => ` ROAS : ${ctx.raw}`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
          color: "#888",
          maxTicksLimit: 8,
        },
        grid: { color: "rgba(0,0,0,0.04)" },
      },
      y: {
        ticks: {
          font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
          color: "#888",
        },
        grid: { color: "rgba(0,0,0,0.06)" },
      },
    },
  }

  const formatEur = (n) => n == null ? "—" : n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €"
  const formatRoas = (n) => n == null ? "—" : n.toFixed(2)
  const isBudgetReduit = budgetCible && budgetActuel && Number(budgetCible) < Number(budgetActuel)

  return (
    <div className="tool-wrapper">
      <div className="grain-overlay" />
      <div className="tool-container">

        {/* ── Header ── */}
        <header className="tool-header">
          <a href="https://lutie.webflow.io" target="_blank" rel="noopener noreferrer" className="tool-logo">
            <img src="https://cdn.prod.website-files.com/68b6be52d4cf251987cb0b82/68b7ba9e3b082f85f53e7e3e_lutie-logo.svg" alt="Lutie" height="32" />
          </a>
          <h1 className="tool-headline">Tu veux doubler ton budget.<br />Voilà ce qui va probablement se passer.</h1>
          <p className="tool-subtitle">Le ROAS ne scale pas linéairement. Voilà combien tu peux perdre — et comment l'éviter.</p>
        </header>

        {/* ── Core inputs ── */}
        <div className="card section-card">
          <div className="section-label">Tes chiffres actuels</div>
          {isBudgetReduit && (
            <div className="info-msg">📉 Tu réduis ton budget — voici ce qui devrait se passer en sens inverse.</div>
          )}
          {errROAS && <div className="warning-msg">{errROAS}</div>}
          <div className="grid-3">
            <NumInput
              label="Budget actuel (€/mois)"
              placeholder="Ex : 5 000"
              value={budgetActuel}
              onChange={setBudgetActuel}
              suffix="€"
            />
            <NumInput
              label="Ton ROAS actuel"
              tooltip="Le ROAS affiché dans Google Ads sur les 30 derniers jours."
              placeholder="Ex : 4.2"
              value={roasActuel}
              onChange={setRoasActuel}
              step="0.1"
            />
            <NumInput
              label="Budget cible (€/mois)"
              placeholder="Ex : 10 000"
              value={budgetCible}
              onChange={setBudgetCible}
              suffix="€"
              error={errBudget}
            />
          </div>
        </div>

        {/* ── Résultats ── */}
        {scenarios && !errBudget && (
          <>
            {/* Graphique */}
            <div className="card section-card chart-card">
              <div className="section-label">Évolution du ROAS selon le budget</div>
              <div className="chart-container">
                <Line data={chartData} options={chartOptions} />
              </div>
              <p className="chart-disclaimer">
                ⚠️ Estimations basées sur les tendances observées dans la littérature Google Ads (WordStream, Search Engine Land). Ces projections sont indicatives et dépendent de la maturité de tes campagnes.
              </p>
              {!marge && (
                <p className="chart-disclaimer" style={{ marginTop: "var(--space-xs)", color: "var(--color-primary)" }}>
                  ⚡ Ajoute ta marge dans "Calibrer" pour afficher le seuil de rentabilité sur le graphique.
                </p>
              )}
            </div>

            {/* Tableau des scénarios */}
            <div className="card section-card">
              <div className="section-label">Synthèse des 3 scénarios pour {Number(budgetCible).toLocaleString("fr-FR")} €/mois</div>
              <div className="scenarios-table">
                <div className="scenarios-header">
                  <div></div>
                  <div className="sc-col sc-opt">🟢 Optimiste</div>
                  <div className="sc-col sc-real">🟡 Réaliste</div>
                  <div className="sc-col sc-pess">🟣 Pessimiste</div>
                </div>
                <div className="scenarios-row">
                  <div className="sc-label">ROAS projeté</div>
                  <div className="sc-col sc-opt">{formatRoas(scenarios.opt?.roas)}</div>
                  <div className="sc-col sc-real">{formatRoas(scenarios.real?.roas)}</div>
                  <div className="sc-col sc-pess">{formatRoas(scenarios.pess?.roas)}</div>
                </div>
                <div className="scenarios-row">
                  <div className="sc-label">CA généré</div>
                  <div className="sc-col sc-opt">{formatEur(scenarios.opt?.ca)}</div>
                  <div className="sc-col sc-real">{formatEur(scenarios.real?.ca)}</div>
                  <div className="sc-col sc-pess">{formatEur(scenarios.pess?.ca)}</div>
                </div>
                {marge && (
                  <div className="scenarios-row scenarios-row--last">
                    <div className="sc-label">Marge nette</div>
                    <div className={`sc-col sc-opt ${scenarios.opt?.margeNette >= 0 ? "val-pos" : "val-neg"}`}>
                      {formatEur(scenarios.opt?.margeNette)}
                    </div>
                    <div className={`sc-col sc-real ${scenarios.real?.margeNette >= 0 ? "val-pos" : "val-neg"}`}>
                      {formatEur(scenarios.real?.margeNette)}
                    </div>
                    <div className={`sc-col sc-pess ${scenarios.pess?.margeNette >= 0 ? "val-pos" : "val-neg"}`}>
                      {formatEur(scenarios.pess?.margeNette)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Conseil */}
            <div className="card card--neutral conseil-card">
              <div className="conseil-title">💡 Avant de scaler, 3 leviers pour limiter la dégradation</div>
              <div className="conseil-list">
                <div className="conseil-item">
                  <span className="conseil-num">1</span>
                  <div><strong>Structure de campagnes</strong> — segmenter les audiences froides et chaudes évite la cannibalisation des audiences les plus rentables.</div>
                </div>
                <div className="conseil-item">
                  <span className="conseil-num">2</span>
                  <div><strong>Qualité du tracking</strong> — un tracking dégradé amplifie la perte de signal à mesure que le budget augmente.</div>
                </div>
                <div className="conseil-item">
                  <span className="conseil-num">3</span>
                  <div><strong>Optimisation des pages</strong> — le taux de conversion est le seul levier qui protège le ROAS indépendamment du budget.</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Affiner ── */}
        {hasCore && (
          <div className="card section-card">
            <button className="expand-btn" onClick={() => setShowAffiner(!showAffiner)}>
              {showAffiner ? "▲ Masquer" : "▼ Calibrer selon ton secteur et ton type de campagne"}
            </button>
            {showAffiner && (
              <div className="expand-content">
                <p className="expand-intro">Les coefficients de dégradation varient selon ton secteur et le type de campagne. On affine les projections.</p>
                <div className="grid-2">
                  <SelectInput
                    label="Secteur d'activité"
                    options={SECTEURS}
                    value={secteur}
                    onChange={setSecteur}
                  />
                  <SelectInput
                    label="Type de campagne principal"
                    options={TYPES_CAMPAGNE}
                    value={typeCampagne}
                    onChange={setTypeCampagne}
                  />
                </div>
                <NumInput
                  label="Marge brute (optionnel — pour calculer la rentabilité)"
                  tooltip="Prix de vente − coût d'achat / prix de vente. Ex : tu vends 100€, ça te coûte 55€ → 45%"
                  suffix="%"
                  placeholder="Ex : 45"
                  value={marge}
                  onChange={setMarge}
                />
                <p className="calibration-note">
                  {typeCampagne === "Performance Max" && "⚠️ Performance Max : dégradation plus forte car la plateforme élargit automatiquement les audiences au scaling."}
                  {typeCampagne === "Search" && "✓ Search : dégradation plus modérée — le volume de requêtes est naturellement limité."}
                  {typeCampagne === "Shopping" && "Shopping : dégradation dans la moyenne du marché."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── CTA ── */}
        {scenarios && (
          <div className="cta-section">
            <p className="cta-text">Tu veux scaler sans détruire ton ROAS&nbsp;? On analyse ton compte.</p>
            <LottieBtn href="https://lutie.webflow.io/contact">
              On en parle — audit offert
            </LottieBtn>
            <p className="cta-sub">Réponse sous 24h · Sans engagement</p>
          </div>
        )}

        <footer className="tool-footer">
          <p>Outil gratuit par <a href="https://lutie.webflow.io" target="_blank" rel="noopener noreferrer">Lutie</a> — Agence Google Ads & Meta Ads</p>
        </footer>
      </div>
    </div>
  )
}
