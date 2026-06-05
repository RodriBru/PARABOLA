"use strict";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const worksheetExamples = [
  "-3x² + 5x - 8",
  "5x² + 7x - 18",
  "-6x² - 2x - 10",
  "4x² + 5x",
  "x² - 16",
  "-6x² + 24x",
  "-4x²",
  "2x²",
  "6x² + x - 1",
  "3x² - 5x + 8"
];

const state = {
  analysis: null,
  guidedIndex: 0,
  graphZoom: 1,
  resultFormat: "exact",
  currentPractice: "x² - 16",
  reconstructedExpression: ""
};

function nearlyEqual(a, b, epsilon = 1e-9) {
  return Math.abs(a - b) < epsilon;
}

function cleanZero(value) {
  return nearlyEqual(value, 0) ? 0 : value;
}

function gcd(a, b) {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

function simplifyFraction(numerator, denominator) {
  if (denominator === 0) return { numerator, denominator };
  let n = Math.trunc(numerator);
  let d = Math.trunc(denominator);
  if (d < 0) {
    n *= -1;
    d *= -1;
  }
  const common = gcd(n, d);
  return { numerator: n / common, denominator: d / common };
}

function normalizeMathText(text) {
  return String(text).replace(/-/g, "−");
}

function formatNumber(value, digits = 3) {
  const cleaned = cleanZero(Number(value));
  if (!Number.isFinite(cleaned)) return "—";
  if (Number.isInteger(cleaned)) return normalizeMathText(String(cleaned));
  return normalizeMathText(cleaned.toLocaleString("es-UY", {
    maximumFractionDigits: digits,
    useGrouping: false
  }));
}

function approximateFraction(value, maxDenominator = 1000, epsilon = 1e-9) {
  const cleaned = cleanZero(Number(value));
  if (!Number.isFinite(cleaned)) return null;
  if (Number.isInteger(cleaned)) {
    return { numerator: cleaned, denominator: 1 };
  }

  const sign = cleaned < 0 ? -1 : 1;
  const target = Math.abs(cleaned);
  let bestNumerator = 0;
  let bestDenominator = 1;
  let bestError = Infinity;

  for (let denominator = 1; denominator <= maxDenominator; denominator += 1) {
    const numerator = Math.round(target * denominator);
    const error = Math.abs(target - numerator / denominator);
    if (error < bestError) {
      bestNumerator = numerator;
      bestDenominator = denominator;
      bestError = error;
    }
    if (error < epsilon) break;
  }

  if (bestError > 1e-7) return null;
  return simplifyFraction(sign * bestNumerator, bestDenominator);
}

function fractionMarkup(numerator, denominator, html = true) {
  const fraction = simplifyFraction(numerator, denominator);
  const numeratorText = normalizeMathText(fraction.numerator);
  const denominatorText = normalizeMathText(fraction.denominator);
  if (fraction.denominator === 1) return numeratorText;
  if (!html) return `${numeratorText}/${denominatorText}`;
  return `<span class="math-frac" aria-label="${numeratorText} sobre ${denominatorText}"><span aria-hidden="true">${numeratorText}</span><span aria-hidden="true">${denominatorText}</span></span>`;
}

function formatExactValue(value, options = {}) {
  const fraction = approximateFraction(value, options.maxDenominator ?? 1000);
  if (!fraction) return formatNumber(value, options.digits ?? 3);
  return fractionMarkup(fraction.numerator, fraction.denominator, options.html !== false);
}

function formatFraction(numerator, denominator, includeApprox = false, options = {}) {
  if (denominator === 0) return "indefinido";
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) {
    return formatValue(numerator / denominator, options.digits ?? 3, options);
  }
  const fraction = simplifyFraction(numerator, denominator);
  const base = fractionMarkup(fraction.numerator, fraction.denominator, options.html !== false);
  const decimal = fraction.numerator / fraction.denominator;
  if (state.resultFormat === "decimal") return formatNumber(decimal, options.digits ?? 3);
  return includeApprox ? `${base} ≈ ${formatNumber(decimal, options.digits ?? 3)}` : base;
}

function formatValue(value, digits = 3, options = {}) {
  if (state.resultFormat === "exact" && options.exact !== false) {
    return formatExactValue(value, { ...options, digits });
  }
  return formatNumber(value, digits);
}

function formatPlainValue(value, digits = 3) {
  return formatValue(value, digits, { html: false });
}

function formatGraphValue(value, digits = 2) {
  return formatNumber(value, digits);
}

function plainMath(text) {
  return String(text)
    .replace(/<span class="math-frac"[^>]*>\s*<span[^>]*>(.*?)<\/span>\s*<span[^>]*>(.*?)<\/span>\s*<\/span>/g, "$1/$2")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function unsignedTerm(value, variable = "") {
  const abs = Math.abs(value);
  const coefficient = variable && nearlyEqual(abs, 1) ? "" : formatNumber(abs);
  return `${coefficient}${variable}`;
}

function formatPolynomial(a, b, c) {
  const terms = [
    { value: a, variable: "x²" },
    { value: b, variable: "x" },
    { value: c, variable: "" }
  ].filter((term) => !nearlyEqual(term.value, 0));

  if (!terms.length) return "0";

  return terms.map((term, index) => {
    const sign = term.value < 0 ? "−" : index === 0 ? "" : "+";
    const spacer = index === 0 ? "" : " ";
    const afterSign = index === 0 && sign === "−" ? "" : sign ? " " : "";
    return `${spacer}${sign}${afterSign}${unsignedTerm(term.value, term.variable)}`;
  }).join("");
}

function parseQuadratic(rawInput) {
  if (!rawInput || !rawInput.trim()) {
    throw new Error("Escribí una función para empezar.");
  }

  let text = rawInput
    .toLowerCase()
    .replace(/,/g, ".")
    .replace(/[−–—]/g, "-")
    .replace(/[·×]/g, "*")
    .replace(/²/g, "^2")
    .replace(/\s+/g, "")
    .replace(/\*/g, "")
    .replace(/x\^?2/g, "x^2");

  if (text.includes("=")) {
    const parts = text.split("=");
    if (parts.length !== 2) {
      throw new Error("Usá una sola igualdad. Ejemplo: f(x)=3x²−2x+1.");
    }
    const left = parts[0];
    const right = parts[1];
    if (/^[a-z]\(x\)$/.test(left) || left === "y") {
      text = right;
    } else if (/^[+-]?0(?:\.0+)?$/.test(right)) {
      text = left;
    } else {
      throw new Error("Por ahora escribí la función desarrollada. Ejemplo: 3x²−2x+1.");
    }
  }

  text = text.replace(/^[a-z]\(x\)/, "");
  if (!text) throw new Error("No pude encontrar la expresión después de f(x)=.");

  if (/[^0-9x+\-.^]/.test(text)) {
    throw new Error("Usá solamente números, x, +, − y x². Ejemplo: −3x² + 5x − 8.");
  }

  text = text.replace(/-/g, "+-");
  if (text.startsWith("+")) text = text.slice(1);
  const terms = text.split("+").filter(Boolean);

  let a = 0;
  let b = 0;
  let c = 0;

  terms.forEach((term) => {
    if (term.includes("x^2")) {
      const coefficientText = term.replace("x^2", "");
      a += parseCoefficient(coefficientText);
      return;
    }
    if (term.includes("x")) {
      const coefficientText = term.replace("x", "");
      b += parseCoefficient(coefficientText);
      return;
    }
    const number = Number(term);
    if (!Number.isFinite(number)) {
      throw new Error(`No entendí el término “${term}”.`);
    }
    c += number;
  });

  a = cleanZero(a);
  b = cleanZero(b);
  c = cleanZero(c);

  if (nearlyEqual(a, 0)) {
    throw new Error("Esta no es una función cuadrática porque el coeficiente de x² vale 0.");
  }

  return { a, b, c, normalized: formatPolynomial(a, b, c) };
}

function parseCoefficient(text) {
  if (text === "" || text === "+") return 1;
  if (text === "-") return -1;
  const number = Number(text);
  if (!Number.isFinite(number)) {
    throw new Error(`No entendí el coeficiente “${text}”.`);
  }
  return number;
}

function analyzeQuadratic({ a, b, c, normalized }) {
  const delta = b * b - 4 * a * c;
  const vertexX = -b / (2 * a);
  const vertexY = -delta / (4 * a);
  const hasTwoRealRoots = delta > 1e-9;
  const hasOneRealRoot = nearlyEqual(delta, 0);
  const hasNoRealRoots = delta < -1e-9;
  let roots = [];

  if (hasTwoRealRoots || hasOneRealRoot) {
    const sqrtDelta = Math.sqrt(Math.max(0, delta));
    roots = [(-b - sqrtDelta) / (2 * a), (-b + sqrtDelta) / (2 * a)]
      .map(cleanZero)
      .sort((x, y) => x - y);
    if (hasOneRealRoot) roots = [roots[0]];
  }

  const analysis = {
    a,
    b,
    c,
    normalized,
    delta,
    vertexX,
    vertexY,
    roots,
    rootDisplay: null,
    signStudy: "",
    monotonicity: "",
    range: "",
    concavity: a > 0 ? "Abre hacia arriba" : "Abre hacia abajo",
    extremum: a > 0 ? "mínimo" : "máximo",
    exactVertexX: "",
    exactVertexY: "",
    tableValues: createTableValues(a, b, c, vertexX, roots)
  };

  updateDerivedValues(analysis);
  return analysis;
}

function getRange(a, vertexY, options = {}) {
  const vertex = formatValue(vertexY, 3, options);
  return a > 0
    ? `Im(f) = [${vertex}, +∞)`
    : `Im(f) = (−∞, ${vertex}]`;
}

function updateDerivedValues(analysis) {
  analysis.exactVertexX = formatFraction(-analysis.b, 2 * analysis.a);
  analysis.exactVertexY = formatFraction(-analysis.delta, 4 * analysis.a);
  analysis.rootDisplay = getRootDisplay(analysis.a, analysis.b, analysis.delta, analysis.roots);
  analysis.signStudy = getSignStudy(analysis.a, analysis.delta, analysis.roots);
  analysis.monotonicity = getMonotonicity(analysis.a, analysis.vertexX);
  analysis.range = getRange(analysis.a, analysis.vertexY);
  analysis.steps = buildSteps(analysis);
}

function getRootDisplay(a, b, delta, roots) {
  if (delta < -1e-9) {
    return {
      short: "No tiene raíces reales",
      detail: "La parábola no corta el eje x.",
      exact: "No existen soluciones reales."
    };
  }

  if (nearlyEqual(delta, 0)) {
    const root = formatValue(roots[0]);
    return {
      short: `Una raíz: x = ${root}`,
      detail: "La parábola toca el eje x una sola vez.",
      exact: `x = ${root}`
    };
  }

  const sqrtDelta = Math.sqrt(delta);
  if (Number.isInteger(sqrtDelta)) {
    const first = formatValue(roots[0]);
    const second = formatValue(roots[1]);
    return {
      short: `x₁ = ${first} · x₂ = ${second}`,
      detail: "La parábola corta el eje x en dos puntos.",
      exact: `x₁ = ${first} · x₂ = ${second}`
    };
  }

  if (state.resultFormat === "exact") {
    const exact = `x = (${formatValue(-b)} ± √${formatValue(delta)}) / ${formatValue(2 * a)}`;
    return {
      short: exact,
      detail: "La parábola corta el eje x en dos puntos. En exacto queda escrito con raíz cuadrada.",
      exact
    };
  }

  return {
    short: `x₁ ≈ ${formatValue(roots[0])} · x₂ ≈ ${formatValue(roots[1])}`,
    detail: "La parábola corta el eje x en dos puntos. Las raíces son decimales aproximadas.",
    exact: `x = (${formatValue(-b)} ± √${formatValue(delta)}) / ${formatValue(2 * a)}`
  };
}

function getSignStudy(a, delta, roots) {
  const positive = a > 0;
  if (delta < -1e-9) {
    return positive
      ? "f(x) &gt; 0 para todo número real."
      : "f(x) &lt; 0 para todo número real.";
  }

  if (nearlyEqual(delta, 0)) {
    const root = formatValue(roots[0]);
    return positive
      ? `f(x) ≥ 0 siempre; vale 0 solamente cuando x = ${root}.`
      : `f(x) ≤ 0 siempre; vale 0 solamente cuando x = ${root}.`;
  }

  const left = formatValue(roots[0]);
  const right = formatValue(roots[1]);
  return positive
    ? `f(x) &gt; 0 si x &lt; ${left} o x &gt; ${right}; f(x) &lt; 0 entre las raíces.`
    : `f(x) &lt; 0 si x &lt; ${left} o x &gt; ${right}; f(x) &gt; 0 entre las raíces.`;
}

function getMonotonicity(a, vertexX) {
  const axis = formatValue(vertexX);
  if (a > 0) {
    return `Decrece hasta x = ${axis}. Después crece.`;
  }
  return `Crece hasta x = ${axis}. Después decrece.`;
}

function evaluate(a, b, c, x) {
  return a * x * x + b * x + c;
}

function createTableValues(a, b, c, vertexX, roots) {
  const base = [vertexX - 2, vertexX - 1, vertexX, vertexX + 1, vertexX + 2];
  roots.forEach((root) => base.push(root));
  if (!base.some((x) => nearlyEqual(x, 0))) base.push(0);

  return base
    .map((x) => cleanZero(x))
    .filter((x, index, values) => values.findIndex((item) => nearlyEqual(item, x)) === index)
    .sort((x, y) => x - y)
    .map((x) => {
      let meaning = "Punto de apoyo";
      if (nearlyEqual(x, vertexX)) meaning = "Vértice";
      else if (roots.some((root) => nearlyEqual(root, x))) meaning = "Raíz: corte con eje x";
      else if (nearlyEqual(x, 0)) meaning = "Corte con eje y";
      return { x, y: cleanZero(evaluate(a, b, c, x)), meaning };
    });
}

function buildSteps(analysis) {
  const { a, b, c, normalized, delta, vertexX, vertexY, rootDisplay, concavity, range, signStudy, monotonicity } = analysis;
  const deltaText = `${formatValue(b)}² − 4 · (${formatValue(a)}) · (${formatValue(c)}) = ${formatValue(delta)}`;
  const rootFormula = delta < -1e-9
    ? "Como Δ es negativo, no hay raíces reales."
    : `x = (−b ± √Δ) ÷ 2a → ${rootDisplay.exact}`;

  return [
    {
      title: "1. Identificar a, b y c",
      explanation: "Comparamos la función con la forma general ax² + bx + c. Cuando falta un término, su coeficiente vale cero.",
      formula: `f(x) = ${normalized} → a = ${formatValue(a)}, b = ${formatValue(b)}, c = ${formatValue(c)}`,
      simple: `El número que acompaña a x² es a. El que acompaña a x es b. El número suelto es c.`
    },
    {
      title: "2. Mirar hacia dónde abre",
      explanation: "El signo de a alcanza para saber la orientación de la parábola.",
      formula: `a = ${formatValue(a)} → ${concavity}`,
      simple: a > 0 ? "Como a es positivo, la parábola tiene forma de U." : "Como a es negativo, la parábola tiene forma de arco."
    },
    {
      title: "3. Calcular el discriminante Δ",
      explanation: "El discriminante permite saber cuántas raíces reales existen antes de aplicar la fórmula general.",
      formula: `Δ = b² − 4ac = ${deltaText}`,
      simple: delta > 0 ? "Δ es positivo: hay dos raíces reales." : nearlyEqual(delta, 0) ? "Δ vale cero: hay una raíz real doble." : "Δ es negativo: no hay raíces reales."
    },
    {
      title: "4. Calcular las raíces",
      explanation: "Las raíces son los valores de x donde f(x) vale cero. En el gráfico son los cortes con el eje horizontal.",
      formula: rootFormula,
      simple: rootDisplay.detail
    },
    {
      title: "5. Calcular el eje de simetría",
      explanation: "El eje de simetría es una línea vertical que pasa por el centro de la parábola.",
      formula: `xᵥ = −b ÷ 2a = ${formatValue(-b)} ÷ ${formatValue(2 * a)} = ${formatValue(vertexX)}`,
      simple: `La línea central de la parábola es x = ${formatValue(vertexX)}.`
    },
    {
      title: "6. Calcular el vértice",
      explanation: "Usamos el valor del eje de simetría como x y lo sustituimos en la función para obtener y.",
      formula: `V = (${formatValue(vertexX)}, f(${formatValue(vertexX)})) = (${formatValue(vertexX)}, ${formatValue(vertexY)})`,
      simple: `El vértice es el punto ${analysis.extremum}: (${formatValue(vertexX)}, ${formatValue(vertexY)}).`
    },
    {
      title: "7. Corte con el eje y",
      explanation: "Para encontrar el corte vertical usamos x = 0. Los términos con x desaparecen y queda c.",
      formula: `f(0) = ${formatValue(c)} → punto (0, ${formatValue(c)})`,
      simple: `La parábola cruza el eje y en ${formatValue(c)}.`
    },
    {
      title: "8. Dominio e imagen",
      explanation: "La función acepta cualquier número real como x. La imagen depende de si el vértice es un mínimo o un máximo.",
      formula: `Dom(f) = ℝ · ${range}`,
      simple: a > 0 ? `La función nunca baja de ${formatValue(vertexY)}.` : `La función nunca sube de ${formatValue(vertexY)}.`
    },
    {
      title: "9. Crecimiento, decrecimiento y signo",
      explanation: "El vértice separa el tramo que crece del que decrece. Las raíces separan los intervalos positivos y negativos.",
      formula: `${monotonicity} ${signStudy}`,
      simple: "Usá el gráfico para comprobarlo: mirá de izquierda a derecha y observá cuándo la curva sube, baja y cruza el eje x."
    }
  ];
}

function createSummaryCards(analysis) {
  const { a, b, c, concavity, rootDisplay, vertexX, vertexY, range, signStudy, monotonicity, delta } = analysis;
  const items = [
    ["Apertura", concavity, a > 0 ? "Tiene un valor mínimo." : "Tiene un valor máximo."],
    ["Raíces", rootDisplay.short, rootDisplay.detail],
    ["Vértice", `V = (${formatValue(vertexX)}, ${formatValue(vertexY)})`, `Es el ${analysis.extremum} de la función.`],
    ["Eje de simetría", `x = ${formatValue(vertexX)}`, "Divide la parábola en dos mitades."],
    ["Coeficientes", `a = ${formatValue(a)} · b = ${formatValue(b)} · c = ${formatValue(c)}`, "Son los tres datos de partida."],
    ["Discriminante", `Δ = ${formatValue(delta)}`, delta > 0 ? "Dos raíces reales." : nearlyEqual(delta, 0) ? "Una raíz real doble." : "Sin raíces reales."],
    ["Dominio e imagen", `Dom(f) = ℝ`, range],
    ["Lectura rápida", monotonicity, signStudy]
  ];

  return items.map(([label, value, note]) => `
    <article class="summary-card">
      <span>${label}</span>
      <strong>${value}</strong>
      <p>${note}</p>
    </article>
  `).join("");
}

function renderAnalysis(analysis, shouldScroll = true, options = {}) {
  const nextGuidedIndex = options.keepPosition ? state.guidedIndex : 0;
  const nextGraphZoom = options.keepPosition ? state.graphZoom : 1;

  updateDerivedValues(analysis);
  state.analysis = analysis;
  state.guidedIndex = Math.min(nextGuidedIndex, analysis.steps.length - 1);
  state.graphZoom = nextGraphZoom;

  $("#formato-resultados").value = state.resultFormat;
  $("#titulo-resultado").textContent = `Estudio de f(x) = ${analysis.normalized}`;
  $("#resumen-cards").innerHTML = createSummaryCards(analysis);
  $("#btn-abrir-pasos").textContent = "Abrir todos";
  $("#lista-pasos").innerHTML = analysis.steps.map((step, index) => `
    <details class="step-details" ${index === 0 ? "open" : ""}>
      <summary>${step.title}</summary>
      <div class="step-content">
        <p>${step.explanation}</p>
        <div class="formula-box">${step.formula}</div>
        <p class="simple-box"><strong>En palabras simples:</strong> ${step.simple}</p>
      </div>
    </details>
  `).join("");

  $("#tabla-valores").innerHTML = analysis.tableValues.map((point) => `
    <tr>
      <td>${formatValue(point.x)}</td>
      <td>${formatValue(point.y)}</td>
      <td>${point.meaning}</td>
    </tr>
  `).join("");

  $("#zona-resultados").hidden = false;
  renderGuidedStep();
  renderGraph();

  if (shouldScroll) {
    $("#zona-resultados").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function renderGuidedStep() {
  if (!state.analysis) return;
  const steps = state.analysis.steps;
  const step = steps[state.guidedIndex];
  $("#contador-pasos").textContent = `Paso ${state.guidedIndex + 1} de ${steps.length}`;
  $("#progreso-pasos").innerHTML = steps.map((item, index) => {
    const plainTitle = item.title.replace(/^\d+\.\s*/, "");
    const statusClass = index === state.guidedIndex ? "active" : index < state.guidedIndex ? "done" : "";
    const current = index === state.guidedIndex ? ' aria-current="step"' : "";
    return `<button class="step-dot ${statusClass}" type="button" data-step-index="${index}" aria-label="Ir al paso ${index + 1}: ${escapeXml(plainTitle)}"${current}></button>`;
  }).join("");
  $("#paso-guiado").innerHTML = `
    <div class="guided-step">
      <h4>${step.title}</h4>
      <p>${step.explanation}</p>
      <div class="formula-box">${step.formula}</div>
      <p class="simple-box"><strong>En palabras simples:</strong> ${step.simple}</p>
    </div>
  `;
  $("#btn-paso-anterior").disabled = state.guidedIndex === 0;
  $("#btn-paso-siguiente").textContent = state.guidedIndex === steps.length - 1 ? "Volver al inicio ↺" : "Siguiente →";
}

function niceStep(range) {
  const rough = range / 10;
  const exponent = Math.floor(Math.log10(Math.max(rough, 0.0001)));
  const fraction = rough / Math.pow(10, exponent);
  let niceFraction = 1;
  if (fraction >= 5) niceFraction = 5;
  else if (fraction >= 2) niceFraction = 2;
  return niceFraction * Math.pow(10, exponent);
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getGraphBounds(analysis) {
  const pointsX = [analysis.vertexX, 0, ...analysis.roots];
  const distances = pointsX.map((value) => Math.abs(value - analysis.vertexX));
  let halfWidth = Math.max(4.5, ...distances, 2.5) + 1.5;
  halfWidth /= state.graphZoom;
  const xMin = analysis.vertexX - halfWidth;
  const xMax = analysis.vertexX + halfWidth;

  const samples = Array.from({ length: 121 }, (_, index) => {
    const x = xMin + (index / 120) * (xMax - xMin);
    return evaluate(analysis.a, analysis.b, analysis.c, x);
  });
  samples.push(0, analysis.vertexY, analysis.c);
  let yMin = Math.min(...samples);
  let yMax = Math.max(...samples);
  if (nearlyEqual(yMin, yMax)) {
    yMin -= 4;
    yMax += 4;
  }
  const padding = Math.max(1.5, (yMax - yMin) * 0.1);
  yMin -= padding;
  yMax += padding;
  return { xMin, xMax, yMin, yMax };
}

function renderGraph() {
  if (!state.analysis) return;
  const svg = $("#grafico-svg");
  const analysis = state.analysis;
  const width = 760;
  const height = 500;
  const padding = { left: 58, right: 24, top: 24, bottom: 46 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const bounds = getGraphBounds(analysis);
  const { xMin, xMax, yMin, yMax } = bounds;
  const xScale = (x) => padding.left + ((x - xMin) / (xMax - xMin)) * plotW;
  const yScale = (y) => padding.top + plotH - ((y - yMin) / (yMax - yMin)) * plotH;

  const xStep = niceStep(xMax - xMin);
  const yStep = niceStep(yMax - yMin);
  let html = `<rect x="0" y="0" width="${width}" height="${height}" fill="var(--surface-strong)"/>`;

  for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax + 1e-9; x += xStep) {
    const px = xScale(x);
    html += `<line x1="${px}" y1="${padding.top}" x2="${px}" y2="${padding.top + plotH}" stroke="var(--line)" stroke-width="1"/>`;
    if (!nearlyEqual(x, 0)) {
      html += `<text x="${px}" y="${padding.top + plotH + 24}" text-anchor="middle" fill="var(--muted)" font-size="13">${escapeXml(formatGraphValue(x, 2))}</text>`;
    }
  }

  for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax + 1e-9; y += yStep) {
    const py = yScale(y);
    html += `<line x1="${padding.left}" y1="${py}" x2="${padding.left + plotW}" y2="${py}" stroke="var(--line)" stroke-width="1"/>`;
    if (!nearlyEqual(y, 0)) {
      html += `<text x="${padding.left - 10}" y="${py + 4}" text-anchor="end" fill="var(--muted)" font-size="13">${escapeXml(formatGraphValue(y, 2))}</text>`;
    }
  }

  const axisX = yMin <= 0 && yMax >= 0 ? yScale(0) : yScale(yMin);
  const axisY = xMin <= 0 && xMax >= 0 ? xScale(0) : xScale(xMin);
  html += `<line x1="${padding.left}" y1="${axisX}" x2="${padding.left + plotW}" y2="${axisX}" stroke="var(--text)" stroke-width="2"/>`;
  html += `<line x1="${axisY}" y1="${padding.top}" x2="${axisY}" y2="${padding.top + plotH}" stroke="var(--text)" stroke-width="2"/>`;
  html += `<text x="${padding.left + plotW - 8}" y="${axisX - 8}" fill="var(--text)" font-size="14" font-weight="700">x</text>`;
  html += `<text x="${axisY + 8}" y="${padding.top + 16}" fill="var(--text)" font-size="14" font-weight="700">y</text>`;

  const path = [];
  for (let index = 0; index <= 360; index += 1) {
    const x = xMin + (index / 360) * (xMax - xMin);
    const y = evaluate(analysis.a, analysis.b, analysis.c, x);
    path.push(`${index === 0 ? "M" : "L"}${xScale(x).toFixed(2)},${yScale(y).toFixed(2)}`);
  }
  html += `<path d="${path.join(" ")}" fill="none" stroke="var(--primary)" stroke-width="4" stroke-linecap="round"/>`;

  const markers = [
    { x: analysis.vertexX, y: analysis.vertexY, label: `V (${formatPlainValue(analysis.vertexX)}, ${formatPlainValue(analysis.vertexY)})`, color: "#8f4f9e" },
    { x: 0, y: analysis.c, label: `(0, ${formatPlainValue(analysis.c)})`, color: "#3d6f9d" },
    ...analysis.roots.map((root) => ({ x: root, y: 0, label: `(${formatPlainValue(root)}, 0)`, color: "#ba6b34" }))
  ];

  markers
    .filter((marker, index, all) => all.findIndex((other) => nearlyEqual(marker.x, other.x) && nearlyEqual(marker.y, other.y)) === index)
    .forEach((marker) => {
      const px = xScale(marker.x);
      const py = yScale(marker.y);
      const labelY = py < 54 ? py + 25 : py - 13;
      html += `<circle cx="${px}" cy="${py}" r="6" fill="${marker.color}" stroke="var(--surface-strong)" stroke-width="3"/>`;
      html += `<text x="${px + 9}" y="${labelY}" fill="${marker.color}" font-size="13" font-weight="700">${escapeXml(marker.label)}</text>`;
    });

  svg.innerHTML = html;
  const rootLegend = analysis.roots.length
    ? '<span class="legend-item"><i class="legend-dot root"></i>Raíces reales</span>'
    : "";
  $("#leyenda-grafico").innerHTML = `
    <span class="legend-item"><i class="legend-dot vertex"></i>Vértice</span>
    ${rootLegend}
    <span class="legend-item"><i class="legend-dot ycut"></i>Corte con eje y</span>
  `;
  $("#btn-zoom-reset").textContent = `${Math.round(state.graphZoom * 100)}%`;
}

function buildPlainTextStudy(analysis) {
  return [
    `ESTUDIO DE f(x) = ${analysis.normalized}`,
    "",
    `Formato: ${state.resultFormat === "exact" ? "exacto / fracciones" : "decimal"}.`,
    `Coeficientes: a = ${formatPlainValue(analysis.a)}, b = ${formatPlainValue(analysis.b)}, c = ${formatPlainValue(analysis.c)}.`,
    `Apertura: ${analysis.concavity}.`,
    `Discriminante: Δ = ${formatPlainValue(analysis.delta)}.`,
    `Raíces: ${plainMath(analysis.rootDisplay.short)}.`,
    `Vértice: V = (${formatPlainValue(analysis.vertexX)}, ${formatPlainValue(analysis.vertexY)}).`,
    `Eje de simetría: x = ${formatPlainValue(analysis.vertexX)}.`,
    `Corte con eje y: (0, ${formatPlainValue(analysis.c)}).`,
    "Dominio: todos los números reales.",
    `Imagen: ${plainMath(analysis.range)}.`,
    `Variación: ${plainMath(analysis.monotonicity)}`,
    `Signo: ${plainMath(analysis.signStudy)}`,
    "",
    "PASOS:",
    ...analysis.steps.map((step) => `${step.title}\n${plainMath(step.formula)}\n${plainMath(step.simple)}`)
  ].join("\n");
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    alert("Este navegador no tiene lectura en voz alta disponible.");
    return;
  }
  window.speechSynthesis.cancel();
  const message = new SpeechSynthesisUtterance(text);
  message.lang = "es-UY";
  message.rate = 0.92;
  window.speechSynthesis.speak(message);
}

function changeView(viewName) {
  $$("[data-view-panel]").forEach((panel) => {
    const active = panel.dataset.viewPanel === viewName;
    panel.hidden = !active;
    panel.classList.toggle("active", active);
  });
  $$("[data-view]").forEach((button) => {
    const active = button.dataset.view === viewName;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function numberInputValue(selector) {
  const value = Number($(selector).value);
  if (!Number.isFinite(value)) throw new Error("Completá todos los valores con números.");
  return value;
}

function reconstructFromGraph() {
  const method = $("#metodo-reconstruccion").value;
  let a;
  let b;
  let c;
  let explanation;

  if (method === "raices") {
    const r1 = numberInputValue("#raiz-uno");
    const r2 = numberInputValue("#raiz-dos");
    const pointX = numberInputValue("#punto-x-raices");
    const pointY = numberInputValue("#punto-y-raices");
    const denominator = (pointX - r1) * (pointX - r2);
    if (nearlyEqual(denominator, 0)) {
      throw new Error("El punto extra no puede estar sobre una raíz. Elegí otro punto visible.");
    }
    a = pointY / denominator;
    b = -a * (r1 + r2);
    c = a * r1 * r2;
    explanation = `Como las raíces son ${formatValue(r1)} y ${formatValue(r2)}, empezamos con f(x) = a(x − ${formatValue(r1)})(x − ${formatValue(r2)}). Usamos el punto (${formatValue(pointX)}, ${formatValue(pointY)}) para encontrar a = ${formatValue(a)}.`;
  } else {
    const h = numberInputValue("#vertice-h");
    const k = numberInputValue("#vertice-k");
    const pointX = numberInputValue("#punto-x-vertice");
    const pointY = numberInputValue("#punto-y-vertice");
    const denominator = (pointX - h) ** 2;
    if (nearlyEqual(denominator, 0)) {
      throw new Error("El punto extra no puede ser el mismo vértice. Elegí otro punto visible.");
    }
    a = (pointY - k) / denominator;
    b = -2 * a * h;
    c = a * h * h + k;
    explanation = `Con vértice (${formatValue(h)}, ${formatValue(k)}) usamos f(x) = a(x − ${formatValue(h)})² + ${formatValue(k)}. El punto (${formatValue(pointX)}, ${formatValue(pointY)}) permite calcular a = ${formatValue(a)}.`;
  }

  a = cleanZero(a);
  b = cleanZero(b);
  c = cleanZero(c);
  if (nearlyEqual(a, 0)) throw new Error("Los datos forman una recta, no una parábola. Revisá el punto elegido.");

  state.reconstructedExpression = formatPolynomial(a, b, c);
  $("#formula-reconstruida").textContent = `f(x) = ${state.reconstructedExpression}`;
  $("#pasos-reconstruccion").innerHTML = `
    <p>${explanation}</p>
    <div class="formula-box">Forma desarrollada: f(x) = ${state.reconstructedExpression}</div>
    <p class="simple-box"><strong>Siguiente paso:</strong> abrí el estudio completo para calcular raíces, vértice, eje, signo, crecimiento e imagen.</p>
  `;
  $("#resultado-reconstruccion").hidden = false;
}

function createRandomExercise(level) {
  const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  let a;
  let b;
  let c;

  if (level === "1") {
    a = random(1, 4) * (Math.random() < 0.35 ? -1 : 1);
    b = Math.random() < 0.55 ? 0 : random(-6, 6);
    c = Math.random() < 0.45 ? 0 : random(-18, 18);
  } else if (level === "2") {
    a = random(1, 6) * (Math.random() < 0.4 ? -1 : 1);
    b = random(-10, 10);
    c = random(-18, 18);
  } else {
    a = random(1, 7) * (Math.random() < 0.5 ? -1 : 1);
    b = random(-12, 12);
    c = random(-20, 20);
  }

  if (nearlyEqual(b, 0) && nearlyEqual(c, 0)) c = random(1, 8);
  return formatPolynomial(a, b, c);
}

function renderWorksheet() {
  $("#lista-guia").innerHTML = worksheetExamples.map((example, index) => `
    <button class="worksheet-button" type="button" data-worksheet="${example}">
      <span><strong>${String.fromCharCode(97 + index)})</strong> f(x) = ${example}</span>
      <span aria-hidden="true">→</span>
    </button>
  `).join("");
}

function savePreferences() {
  const prefs = {
    text: $("#ajuste-texto").value,
    spacing: $("#ajuste-espaciado").value,
    theme: $("#ajuste-tema").value,
    ruler: $("#ajuste-regla").checked,
    motion: $("#ajuste-movimiento").checked
  };
  localStorage.setItem("parabola-facil-prefs", JSON.stringify(prefs));
  applyPreferences(prefs);
}

function loadPreferences() {
  const saved = localStorage.getItem("parabola-facil-prefs");
  const prefs = saved ? JSON.parse(saved) : { text: "1", spacing: "1", theme: "crema", ruler: false, motion: false };
  $("#ajuste-texto").value = prefs.text ?? "1";
  $("#ajuste-espaciado").value = prefs.spacing ?? "1";
  $("#ajuste-tema").value = prefs.theme ?? "crema";
  $("#ajuste-regla").checked = Boolean(prefs.ruler);
  $("#ajuste-movimiento").checked = Boolean(prefs.motion);
  applyPreferences(prefs);
}

function applyPreferences(prefs) {
  document.body.classList.toggle("text-large", prefs.text === "1");
  document.body.classList.toggle("text-xlarge", prefs.text === "2");
  document.body.classList.toggle("spacing-compact", prefs.spacing === "0");
  document.body.classList.toggle("spacing-wide", prefs.spacing === "2");
  document.body.classList.remove("theme-celeste", "theme-blanco", "theme-oscuro");
  if (prefs.theme !== "crema") document.body.classList.add(`theme-${prefs.theme}`);
  document.body.classList.toggle("reduce-motion", Boolean(prefs.motion));
  $("#regla-lectura").hidden = !prefs.ruler;
  if (state.analysis) renderGraph();
}

function initEvents() {
  $("#form-resolver").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      $("#error-funcion").textContent = "";
      const parsed = parseQuadratic($("#input-funcion").value);
      renderAnalysis(analyzeQuadratic(parsed));
    } catch (error) {
      $("#error-funcion").textContent = error.message;
    }
  });

  $$("[data-example]").forEach((button) => {
    button.addEventListener("click", () => {
      $("#input-funcion").value = button.dataset.example;
      $("#form-resolver").requestSubmit();
    });
  });

  $$("[data-view]").forEach((button) => {
    button.addEventListener("click", () => changeView(button.dataset.view));
  });

  $("#btn-paso-anterior").addEventListener("click", () => {
    state.guidedIndex = Math.max(0, state.guidedIndex - 1);
    renderGuidedStep();
  });

  $("#btn-paso-siguiente").addEventListener("click", () => {
    if (!state.analysis) return;
    state.guidedIndex = state.guidedIndex === state.analysis.steps.length - 1 ? 0 : state.guidedIndex + 1;
    renderGuidedStep();
  });

  $("#progreso-pasos").addEventListener("click", (event) => {
    const button = event.target.closest("[data-step-index]");
    if (!button || !state.analysis) return;
    state.guidedIndex = Number(button.dataset.stepIndex);
    renderGuidedStep();
  });

  $("#btn-abrir-pasos").addEventListener("click", () => {
    const details = $$(".step-details");
    const shouldOpen = details.some((item) => !item.open);
    details.forEach((item) => { item.open = shouldOpen; });
    $("#btn-abrir-pasos").textContent = shouldOpen ? "Cerrar todos" : "Abrir todos";
  });

  $("#formato-resultados").addEventListener("change", () => {
    state.resultFormat = $("#formato-resultados").value;
    if (state.analysis) {
      renderAnalysis(state.analysis, false, { keepPosition: true });
    }
  });

  $("#btn-zoom-mas").addEventListener("click", () => {
    state.graphZoom = Math.min(2.3, state.graphZoom * 1.2);
    renderGraph();
  });

  $("#btn-zoom-menos").addEventListener("click", () => {
    state.graphZoom = Math.max(0.5, state.graphZoom / 1.2);
    renderGraph();
  });

  $("#btn-zoom-reset").addEventListener("click", () => {
    state.graphZoom = 1;
    renderGraph();
  });

  $("#btn-leer-intro").addEventListener("click", () => {
    speak("El orden recomendado es simple. Primero identificamos a, b y c. Después calculamos discriminante, raíces, eje y vértice. Al final interpretamos signo, crecimiento, imagen y gráfico.");
  });

  $("#btn-leer-resultado").addEventListener("click", () => {
    if (!state.analysis) return;
    speak(buildPlainTextStudy(state.analysis));
  });

  $("#btn-copiar").addEventListener("click", async () => {
    if (!state.analysis) return;
    const text = buildPlainTextStudy(state.analysis);
    try {
      await navigator.clipboard.writeText(text);
      $("#btn-copiar").textContent = "Copiado ✓";
      setTimeout(() => { $("#btn-copiar").textContent = "Copiar estudio"; }, 1600);
    } catch {
      alert(text);
    }
  });

  $("#btn-imprimir").addEventListener("click", () => {
    $$(".step-details").forEach((item) => { item.open = true; });
    window.print();
  });

  $("#metodo-reconstruccion").addEventListener("change", () => {
    const method = $("#metodo-reconstruccion").value;
    $("#campos-raices").hidden = method !== "raices";
    $("#campos-vertice").hidden = method !== "vertice";
  });

  $("#form-reconstruir").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      $("#error-reconstruccion").textContent = "";
      reconstructFromGraph();
    } catch (error) {
      $("#error-reconstruccion").textContent = error.message;
    }
  });

  $("#btn-estudiar-reconstruida").addEventListener("click", () => {
    if (!state.reconstructedExpression) return;
    changeView("resolver");
    $("#input-funcion").value = state.reconstructedExpression;
    const parsed = parseQuadratic(state.reconstructedExpression);
    renderAnalysis(analyzeQuadratic(parsed));
  });

  $("#btn-nuevo-ejercicio").addEventListener("click", () => {
    state.currentPractice = createRandomExercise($("#nivel-practica").value);
    $("#ejercicio-actual").textContent = `f(x) = ${state.currentPractice}`;
    $("#pista-ejercicio").textContent = "Pista: primero identificá a, b y c. Después fijate en el signo de a.";
  });

  $("#btn-resolver-ejercicio").addEventListener("click", () => {
    changeView("resolver");
    $("#input-funcion").value = state.currentPractice;
    const parsed = parseQuadratic(state.currentPractice);
    renderAnalysis(analyzeQuadratic(parsed));
  });

  $("#lista-guia").addEventListener("click", (event) => {
    const button = event.target.closest("[data-worksheet]");
    if (!button) return;
    changeView("resolver");
    $("#input-funcion").value = button.dataset.worksheet;
    const parsed = parseQuadratic(button.dataset.worksheet);
    renderAnalysis(analyzeQuadratic(parsed));
  });

  $("#btn-ajustes").addEventListener("click", () => {
    const panel = $("#panel-ajustes");
    panel.hidden = !panel.hidden;
    $("#btn-ajustes").setAttribute("aria-expanded", String(!panel.hidden));
  });

  $("#btn-cerrar-ajustes").addEventListener("click", () => {
    $("#panel-ajustes").hidden = true;
    $("#btn-ajustes").setAttribute("aria-expanded", "false");
  });

  ["#ajuste-texto", "#ajuste-espaciado", "#ajuste-tema", "#ajuste-regla", "#ajuste-movimiento"].forEach((selector) => {
    $(selector).addEventListener("change", savePreferences);
    $(selector).addEventListener("input", savePreferences);
  });

  document.addEventListener("mousemove", (event) => {
    const ruler = $("#regla-lectura");
    if (!ruler.hidden) ruler.style.top = `${event.clientY}px`;
  });
}

function init() {
  renderWorksheet();
  loadPreferences();
  initEvents();
}

document.addEventListener("DOMContentLoaded", init);
