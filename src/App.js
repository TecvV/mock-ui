
import React, { useEffect, useMemo, useRef, useState } from "react";
import { answerKey as defaultAnswerKey, questionsData as defaultQuestionsData } from "./questions";
import VirtualCalculator from "./components/VirtualCalculator";
import VirtualKeypad from "./components/VirtualKeypad";
import "./app.css";

const sections = [
  { id: "VARC", subsection: "VARC" },
  { id: "DILR", subsection: "DILR" },
  { id: "QA", subsection: "QA" },
];

const sectionLookup = Object.fromEntries(sections.map((section) => [section.id, section]));
const SECTIONAL_TIMES = {
  VARC: 40 * 60,
  DILR: 40 * 60,
  QA: 40 * 60,
};

const SECTION_TIME_SECONDS = 40 * 60;
const AVATAR_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 180 180'><rect x='2' y='2' width='176' height='176' rx='16' fill='#d7e3ef' stroke='#7e91a6' stroke-width='3'/><circle cx='90' cy='62' r='36' fill='#dfe7ee' stroke='#6d8196' stroke-width='4'/><path d='M42 142c8-28 26-44 48-44s40 16 48 44' fill='#d5e0ea' stroke='#6d8196' stroke-width='4'/><path d='M66 124h48l-12 28H78z' fill='#2f5276'/></svg>`);

const CALCULATOR_ICON =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect x='6' y='4' width='52' height='56' rx='8' fill='#f4f7fb' stroke='#6e8aa6' stroke-width='3'/><rect x='13' y='10' width='38' height='12' rx='3' fill='#2f89c2'/><g fill='#2f4459'><rect x='13' y='27' width='10' height='8' rx='2'/><rect x='27' y='27' width='10' height='8' rx='2'/><rect x='41' y='27' width='10' height='8' rx='2'/><rect x='13' y='39' width='10' height='8' rx='2'/><rect x='27' y='39' width='10' height='8' rx='2'/><rect x='41' y='39' width='10' height='20' rx='2'/><rect x='13' y='51' width='24' height='8' rx='2'/></g></svg>`);

const pad = (value) => String(value).padStart(2, "0");
const formatClock = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs}:${pad(mins)}:${pad(secs)}`;
};

const normalizeMathText = (input) => {
  if (!input) return "";
  let text = String(input);
  text = text.replace(/\\\(|\\\)|\\\[|\\\]/g, " ");
  text = text.replace(/\{([^{}]+)\s*\\over\s*\{([^{}]+)\}\}/g, "($1/$2)");
  text = text.replace(/\\sqrt\s*\{([^{}]+)\}/g, "√($1)");
  text = text.replace(/\\sqrt\s*([A-Za-z0-9]+)/g, "√($1)");
  text = text.replace(/\\times/g, "×");
  text = text.replace(/\\div/g, "÷");
  text = text.replace(/\\cdot/g, "·");
  text = text.replace(/\\geq/g, "≥").replace(/\\leq/g, "≤");
  text = text.replace(/\\neq/g, "≠");
  text = text.replace(/\\,/g, " ");
  text = text.replace(/[{}]/g, "");
  text = text.replace(/\\([A-Za-z]+)/g, "$1");
  return text.replace(/\s{2,}/g, " ").trim();
};

const decodeHtmlEntities = (text) => String(text || "")
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">")
  .replace(/&#39;/g, "'")
  .replace(/&quot;/gi, '"');

const resolveImportedAssetSrc = (src, assetMap) => {
  const raw = String(src || "").trim();
  if (!raw) return "";
  if (/^(?:https?:|data:|blob:|file:)/i.test(raw)) return raw;
  const clean = raw.replace(/^[.\\/]+/, "").replace(/\\/g, "/");
  if (!assetMap) return clean;
  return assetMap[clean] || assetMap[clean.split("/").pop()] || clean;
};

const applyParagraphBreakRules = (input) => {
  if (!input) return "";
  let text = String(input);
  text = text.replace(/\s+/g, " ").trim();

  text = text.replace(/(Directions?\s+for\s+questions?\s*\d+\s*to\s*\d+\s*:\s*)/gi, "\n\n$1");
  text = text.replace(/(Choose\s+the\s+best\s+answer\s+to\s+each\s+question\.)/gi, "$1\n\n");
  text = text.replace(/(Answer\s+the\s+questions?\s+on\s+the\s+basis\s+of\s+the\s+information\s+given\s+below\.)/gi, "$1\n\n");
  text = text.replace(/(The\s+passage\s+given\s+below\s+is\s+followed\s+by\s+four\s+alternate\s+summaries\.\s*Choose\s+the\s+option\s+that\s+best\s+captures\s+the\s+essence\s+of\s+the\s+passage\.)/gi, "$1\n\n");
  text = text.replace(/(There\s+is\s+a\s+sentence\s+that\s+is\s+missing\s+in\s+the\s+paragraph\s+below\.[\s\S]*?would\s+best\s+fit\.)/gi, "$1\n\n");
  text = text.replace(/(Sentence:\s*[\s\S]*?)(\s+Paragraph:\s*)/gi, "$1\n\n$2");
  text = text.replace(/(Marks\s+for\s+correct\s+answer\s*\d+\s*\|\s*Negative\s+Marks\s*\d+[^.]*\.)/gi, "$1\n\n");

  text = text.replace(/([:.?])\s+(\d+\.)\s+/g, "$1\n\n$2 ");
  text = text.replace(/([:.?])\s+(\d+\))\s+/g, "$1\n\n$2 ");
  text = text.replace(/([:.?])\s+(\([ivxlcdm]+\))\s+/gi, "$1\n\n$2 ");

  text = text.replace(/\s+(\d+\.)\s+/g, (m, p1, offset, full) => {
    const prev = full.slice(Math.max(0, offset - 2), offset);
    return /[\n.:)]/.test(prev) ? `\n\n${p1} ` : m;
  });
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
};

const ensureRcParagraphs = (paragraphs) => {
  const splitLongParagraph = (text) => {
    const single = String(text || "").trim();
    if (single.length < 450) return [single];
    const sentences = single
      .split(/(?<=[.?!])\s+(?=(?:[A-Z]|["']))/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (sentences.length >= 6) {
      const parts = 3;
      const chunk = Math.ceil(sentences.length / parts);
      const out = [];
      for (let i = 0; i < sentences.length; i += chunk) {
        out.push(sentences.slice(i, i + chunk).join(" ").trim());
      }
      return out.filter(Boolean);
    }

    const words = single.split(/\s+/).filter(Boolean);
    if (words.length < 90) return [single];
    const targetParts = 3;
    const perPart = Math.ceil(words.length / targetParts);
    const out = [];
    for (let i = 0; i < words.length; i += perPart) {
      out.push(words.slice(i, i + perPart).join(" ").trim());
    }
    return out.filter(Boolean);
  };

  return paragraphs.flatMap((p) => splitLongParagraph(p));
};

const normalizeImportedText = (text) => {
  if (!text) return "";
  const paragraphMarker = "__PARA_BREAK__";
  let cleaned = normalizeMathText(text).replace(/\r/g, "").trim();
  cleaned = cleaned.replace(/style="[^"]*(?:!important|--sf-img)[^"]*"/gi, " ");
  cleaned = cleaned.replace(/var\(--sf-img-[^)]+\)/gi, " ");
  cleaned = cleaned.replace(/[a-z-]+\s*:[^;]{0,160}!important;?/gi, " ");
  cleaned = cleaned.replace(/['"]>\s*/g, " ");
  cleaned = cleaned.replace(/\n{2,}/g, paragraphMarker);
  cleaned = cleaned.replace(/\n+/g, " ");
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  cleaned = cleaned.replace(/\bBookmark\s*FeedBack\b/gi, "");
  cleaned = cleaned.replace(/\bBookmark\b/gi, "");
  cleaned = cleaned.replace(/\bFeedBack\b/gi, "");
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
  cleaned = cleaned.replace(new RegExp(paragraphMarker, "g"), "\n\n");
  return applyParagraphBreakRules(cleaned);
};

const toParagraphs = (text) =>
  normalizeImportedText(text)
    .split(/\n{2,}/)
    .map((x) => x.trim())
    .filter(Boolean);

const formatQuestionParagraphs = (text) => {
  if (!text) return [];
  let cleaned = text.replace(/\r/g, "").trim();
  cleaned = cleaned.replace(/\n{2,}/g, "__PARA_BREAK__");
  cleaned = cleaned.replace(/\n+/g, " ");
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  cleaned = cleaned.replace(/__PARA_BREAK__/g, "\n\n");
  cleaned = applyParagraphBreakRules(cleaned);
  return cleaned.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
};

const renderInlineMedia = (text, keyPrefix) => {
  const parts = String(text || "").split(/(\[\[(?:IMG|SUP|SUB):[^\]]+\]\])/g).filter(Boolean);
  return parts.map((part, idx) => {
    const imgMarker = part.match(/^\[\[IMG:([^\]]+)\]\]$/);
    if (imgMarker) return <img key={`${keyPrefix}-img-${idx}`} src={imgMarker[1].trim()} alt="" className="inline-media-img" />;
    const supMarker = part.match(/^\[\[SUP:([^\]]+)\]\]$/);
    if (supMarker) return <sup key={`${keyPrefix}-sup-${idx}`}>{supMarker[1]}</sup>;
    const subMarker = part.match(/^\[\[SUB:([^\]]+)\]\]$/);
    if (subMarker) return <sub key={`${keyPrefix}-sub-${idx}`}>{subMarker[1]}</sub>;
    return <span key={`${keyPrefix}-txt-${idx}`} className="inline-media-text">{part}</span>;
  });
};

const normalizeBlockWithImages = (raw, assetMap) => {
  if (!raw) return "";
  let s = raw;
  s = s.replace(/<sup\b[^>]*>([\s\S]*?)<\/sup>/gi, (_m, g1) => `[[SUP:${String(g1 || "").replace(/<[^>]+>/g, "").trim()}]]`);
  s = s.replace(/<sub\b[^>]*>([\s\S]*?)<\/sub>/gi, (_m, g1) => `[[SUB:${String(g1 || "").replace(/<[^>]+>/g, "").trim()}]]`);
  s = s.replace(
    /<img\b[^>]*?src\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>/gi,
    (_m, g1, g2, g3) => `\n[[IMG:${resolveImportedAssetSrc(g1 || g2 || g3 || "", assetMap)}]]\n`
  );
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<[^>]+>/g, "");
  s = decodeHtmlEntities(s);
  s = s.replace(/\bBookmark\s*FeedBack\b/gi, " ");
  s = s.replace(/\bBookmark\b/gi, " ");
  s = s.replace(/\bFeedBack\b/gi, " ");
  s = normalizeMathText(s);
  return s.replace(/\r/g, "").split("\n").map((line) => line.replace(/\s+/g, " ").trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
};
const sectionSliceByTab = (content, tabId, nextTabId) => {
  const start = content.indexOf(`<div id=${tabId}`);
  if (start === -1) return "";
  if (nextTabId) {
    const end = content.indexOf(`<div id=${nextTabId}`, start);
    if (end !== -1) return content.slice(start, end);
  }
  return content.slice(start);
};

const parseQuestionsFromHtml = (html) => {
  const sectionsMeta = [
    { id: "VARC", tab: "tab1", next: "tab2" },
    { id: "DILR", tab: "tab2", next: "tab3" },
    { id: "QA", tab: "tab3", next: null },
  ];
  const result = { VARC: [], DILR: [], QA: [] };
  const lastContextBySection = { VARC: "", DILR: "", QA: "" };

  sectionsMeta.forEach((meta) => {
    const chunk = sectionSliceByTab(html, meta.tab, meta.next);
    if (!chunk) return;
    const tables = chunk.match(/<table[^>]*>[\s\S]*?<\/table>/gi) || [];

    tables.forEach((table) => {
      if (!/<b[^>]*>\s*Q\.\s*\d+/i.test(table)) return;
      const qHeaderMatch = table.match(/<b[^>]*>\s*Q\.\s*(\d+)\s*\[[^\]]*\]\s*<\/b>/i);
      if (!qHeaderMatch) return;
      const qHeaderIdx = qHeaderMatch.index ?? -1;
      const qBodyMatch = table.match(/<b[^>]*>\s*Q\.\s*\d+\s*\[[^\]]*\]\s*<\/b>\s*<br>([\s\S]*?)(?=<div\s+class\s*=\s*pull-right|<\/table>)/i);
      const qBody = qBodyMatch ? qBodyMatch[1] : "";

      const beforeQ = qHeaderIdx >= 0 ? table.slice(0, qHeaderIdx) : "";
      const contextCandidates = [
        ...beforeQ.matchAll(/<div[^>]*>([\s\S]*?)<\/div>/gi),
      ]
        .map((m) => normalizeBlockWithImages(m[1]))
        .filter((text) => text && text.length > 40);
      const rawBeforeText = normalizeBlockWithImages(beforeQ);
      const directionsMatch = rawBeforeText.match(/Directions\s+for\s+questions[\s\S]*/i);
      const directionsText = directionsMatch ? directionsMatch[0].trim() : "";
      const context = contextCandidates.length
        ? contextCandidates[contextCandidates.length - 1]
        : directionsText;

      const hasRadio = /<input[^>]*type\s*=\s*["']?radio["']?/i.test(qBody);
      const optionMatches = [...qBody.matchAll(/<tr><td[^>]*>\s*([1-4])\s*(?:&nbsp;)?\s*<input[^>]*type\s*=\s*["']?radio["']?[^>]*>\s*([\s\S]*?)(?=<tr><td[^>]*>\s*[1-4]\s*(?:&nbsp;)?\s*<input[^>]*type\s*=\s*["']?radio["']?|<div\s+class\s*=\s*pull-right|$)/gi)];
      const options = optionMatches.map((m) => ({ n: Number(m[1]), t: normalizeBlockWithImages(m[2]) })).sort((a, b) => a.n - b.n).map((x) => x.t);
      const optStart = qBody.search(/<tr><td[^>]*>\s*[1-4]\s*(?:&nbsp;)?\s*<input[^>]*type\s*=\s*["']?radio["']?/i);
      const qText = normalizeBlockWithImages(optStart >= 0 ? qBody.slice(0, optStart) : qBody);

      const qObj = { id: result[meta.id].length + 1, question: qText, type: hasRadio && options.length ? "MCQ" : "TITA" };
      if (hasRadio && options.length) qObj.options = options;
      if (meta.id === "VARC" && context) {
        qObj.isRC = true;
        qObj.passage = context;
      }
      if (context) lastContextBySection[meta.id] = context;
      if (meta.id === "DILR" || meta.id === "QA") {
        const resolvedSetText = context || lastContextBySection[meta.id] || "";
        if (resolvedSetText) qObj.setText = resolvedSetText;
      }
      result[meta.id].push(qObj);
    });
  });

  return result;
};

const extractBalancedLiteral = (source, start) => {
  let i = start;
  while (i < source.length && /\s/.test(source[i])) i += 1;
  const open = source[i];
  const close = open === "[" ? "]" : open === "{" ? "}" : "";
  if (!close) return "";

  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;
  const begin = i;

  for (; i < source.length; i += 1) {
    const ch = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) {
        inString = false;
        quote = "";
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      quote = ch;
      continue;
    }
    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return source.slice(begin, i + 1);
    }
  }
  return "";
};

const extractVarLiteral = (source, varName) => {
  const marker = new RegExp(`var\\s+${varName}\\s*=`, "i");
  const match = marker.exec(source);
  if (!match) return "";
  const start = match.index + match[0].length;
  return extractBalancedLiteral(source, start);
};

const parseLooseJsonLiteral = (literal) => {
  if (!literal) return null;
  try {
    return JSON.parse(literal);
  } catch {
    try {
      return Function(`"use strict"; return (${literal});`)();
    } catch {
      return null;
    }
  }
};

const mapImsSectionName = (name) => {
  const s = String(name || "").toLowerCase();
  if (s.includes("verbal") || s.includes("reading")) return "VARC";
  if (s.includes("data interpretation") || s.includes("logical")) return "DILR";
  if (s.includes("quant")) return "QA";
  return "";
};

const parseImsBundleFromHtml = (html) => {
  const sectionsRaw = parseLooseJsonLiteral(extractVarLiteral(html, "sections")) || [];
  const questionsRaw = parseLooseJsonLiteral(extractVarLiteral(html, "Questions")) || [];
  if (!questionsRaw.length) throw new Error("Could not parse IMS questions payload from file.");

  const sectionById = {};
  sectionsRaw.forEach((sec) => {
    const mapped = mapImsSectionName(sec?.sectionname);
    if (!mapped) return;
    sectionById[String(sec.sectionid)] = mapped;
  });

  const questionsData = { VARC: [], DILR: [], QA: [] };
  const answerKey = { VARC: [], DILR: [], QA: [] };
  const answerSolutions = { VARC: [], DILR: [], QA: [] };

  questionsRaw.forEach((q) => {
    const fallbackSection = mapImsSectionName(q?.SubjectName) || mapImsSectionName(q?.AreaName);
    const section = sectionById[String(q?.QuestionPaperSectionID)] || fallbackSection;
    if (!section || !questionsData[section]) return;

    const questionText = normalizeBlockWithImages(q?.Items || "");
    if (!questionText) return;

    const itemOptions = Array.isArray(q?.ItemOptionResponse) ? q.ItemOptionResponse : [];
    const options = itemOptions.map((opt) => normalizeBlockWithImages(opt?.Options || "")).filter(Boolean);
    const isMCQ = String(q?.ItemType || "").toLowerCase().includes("mcq");
    const type = isMCQ && options.length ? "MCQ" : "TITA";
    const context = normalizeBlockWithImages(q?.Passage || q?.Direction || "");

    const item = {
      id: questionsData[section].length + 1,
      question: questionText,
      type,
    };
    if (type === "MCQ") item.options = options;
    if (context) {
      if (section === "VARC" && /reading comprehension/i.test(String(q?.AreaName || ""))) {
        item.isRC = true;
        item.passage = context;
      } else if (section === "DILR" || section === "QA") {
        item.setText = context;
      }
    }
    questionsData[section].push(item);

    let mappedAnswer = "";
    if (type === "MCQ") {
      const idx = itemOptions.findIndex((opt) => opt?.IsCorrect === true || String(opt?.IsCorrect).toLowerCase() === "true");
      mappedAnswer = idx >= 0 ? String(idx) : "";
    } else {
      const direct = q?.CorrectAnswer || q?.Answer || q?.enteredText || "";
      mappedAnswer = String(direct || "").trim();
      if (!mappedAnswer) {
        const expText = normalizeBlockWithImages(q?.Explanation || "");
        const m = expText.match(/(?:Hence|Therefore)[^[]*\[([^\]]+)\]|answer\s*(?:is|:)\s*([A-Za-z0-9.\-]+)/i);
        mappedAnswer = (m?.[1] || m?.[2] || "").trim();
      }
    }
    answerKey[section].push(mappedAnswer);
    answerSolutions[section].push(normalizeBlockWithImages(q?.Explanation || ""));
  });

  if (!["VARC", "DILR", "QA"].every((sec) => questionsData[sec].length)) {
    throw new Error("IMS file parsed, but one or more sections are empty.");
  }
  return { questionsData, answerKey, answerSolutions };
};

const createEmptyBySection = (questions, fillValue = "") => ({
  VARC: Array.from({ length: questions.VARC?.length || 0 }, () => fillValue),
  DILR: Array.from({ length: questions.DILR?.length || 0 }, () => fillValue),
  QA: Array.from({ length: questions.QA?.length || 0 }, () => fillValue),
});

const buildSectionSubset = (source, activeSectionIds, fillValue = "") => {
  const result = createEmptyBySection({ VARC: [], DILR: [], QA: [] }, fillValue);
  activeSectionIds.forEach((sectionId) => {
    result[sectionId] = Array.isArray(source?.[sectionId]) ? [...source[sectionId]] : [];
  });
  return result;
};

const normalizeQuestionIds = (questionsData) => {
  const normalized = { VARC: [], DILR: [], QA: [] };
  Object.keys(normalized).forEach((sectionId) => {
    normalized[sectionId] = (questionsData?.[sectionId] || []).map((question, idx) => ({
      ...question,
      id: idx + 1,
    }));
  });
  return normalized;
};

const buildExamSubset = ({ questionsData, answerKey, answerSolutions }, activeSectionIds) => {
  const normalizedQuestions = normalizeQuestionIds(buildSectionSubset(questionsData, activeSectionIds));
  const normalizedAnswers = buildSectionSubset(answerKey, activeSectionIds);
  const normalizedSolutions = buildSectionSubset(answerSolutions, activeSectionIds);
  return {
    questionsData: normalizedQuestions,
    answerKey: normalizedAnswers,
    answerSolutions: normalizedSolutions,
  };
};

const defaultExamBundle = buildExamSubset(
  {
    questionsData: defaultQuestionsData,
    answerKey: defaultAnswerKey,
    answerSolutions: createEmptyBySection(defaultQuestionsData, ""),
  },
  sections.map((section) => section.id)
);

const getSectionDuration = (activeSections, sectionIdx) => {
  const sectionId = activeSections?.[sectionIdx]?.id;
  return SECTIONAL_TIMES[sectionId] || SECTION_TIME_SECONDS;
};

const mapGlobalQuestionNo = (qNo, questions) => {
  const varcLen = questions.VARC?.length || 0;
  const dilrLen = questions.DILR?.length || 0;
  if (qNo >= 1 && qNo <= varcLen) return { section: "VARC", index: qNo - 1 };
  if (qNo > varcLen && qNo <= varcLen + dilrLen) return { section: "DILR", index: qNo - varcLen - 1 };
  if (qNo > varcLen + dilrLen && qNo <= varcLen + dilrLen + (questions.QA?.length || 0)) {
    return { section: "QA", index: qNo - varcLen - dilrLen - 1 };
  }
  return null;
};

const normalizeAnswerToken = (raw, question) => {
  const value = String(raw || "").trim();
  if (/^[1-4]$/.test(value) && question?.type === "MCQ") return String(Number(value) - 1);
  return value;
};

const parseAnswerBundleFromHtml = (html, questions) => {
  const answers = createEmptyBySection(questions, "");
  const solutions = createEmptyBySection(questions, "");
  const qBlocks = [
    ...html.matchAll(/(<b[^>]*>\s*Q\.\s*(\d+)\s*\[[^\]]*\]\s*<\/b>[\s\S]*?)(?=<b[^>]*>\s*Q\.\s*\d+\s*\[[^\]]*\]\s*<\/b>|$)/gi),
  ];

  qBlocks.forEach((m) => {
    const block = m[1] || "";
    const qNo = Number(m[2]);
    if (!qNo) return;
    const ansMatch = block.match(/Correct\s*Answer\s*:\s*<b[^>]*>\s*([^<\s]+)/i);
    if (!ansMatch) return;
    const rawAnswer = ansMatch[1].trim();
    const afterAnswerIdx = block.search(/Correct\s*Answer\s*:/i);
    const afterAnswer = afterAnswerIdx >= 0 ? block.slice(afterAnswerIdx) : block;
    const solutionMatch = afterAnswer.match(/<div[^>]*>([\s\S]*)$/i);
    const solutionText = solutionMatch ? normalizeBlockWithImages(solutionMatch[1]) : "";
    const mappedPos = mapGlobalQuestionNo(qNo, questions);
    if (!mappedPos) return;
    const question = questions[mappedPos.section]?.[mappedPos.index];
    answers[mappedPos.section][mappedPos.index] = normalizeAnswerToken(rawAnswer, question);
    if (solutionText) solutions[mappedPos.section][mappedPos.index] = solutionText;
  });

  const sequentialAnswerTokens = [...html.matchAll(/Correct\s*Answer\s*:\s*<b[^>]*>\s*([^<\s]+)/gi)].map((m) => m[1].trim());
  let globalIdx = 0;
  ["VARC", "DILR", "QA"].forEach((sec) => {
    const n = questions[sec]?.length || 0;
    for (let i = 0; i < n; i += 1) {
      if (answers[sec][i] === "") {
        const next = sequentialAnswerTokens[globalIdx];
        if (next) answers[sec][i] = normalizeAnswerToken(next, questions[sec][i]);
      }
      globalIdx += 1;
    }
  });

  const hasAny = ["VARC", "DILR", "QA"].some((sec) => answers[sec].some((x) => x !== ""));
  if (!hasAny) throw new Error("No answer key values found in provided HTML.");
  return { answers, solutions };
};

const inferSectionIdFromLabel = (label) => {
  const value = String(label || "").toUpperCase();
  if (value.includes("DILR") || value.includes("LRDI") || value.includes("DATA")) return "DILR";
  if (value.includes("QA") || value.includes("QUANT")) return "QA";
  return "VARC";
};

const buildAssetMap = async (files) => {
  const entries = await Promise.all(
    Array.from(files || []).map(async (file) => {
      const url = URL.createObjectURL(file);
      const rel = String(file.webkitRelativePath || file.name || "").replace(/\\/g, "/");
      const cleanRel = rel.replace(/^[.\\/]+/, "");
      return [
        [cleanRel, url],
        [cleanRel.split("/").pop(), url],
      ];
    })
  );
  return Object.fromEntries(entries.flat());
};

const parseClSectionalHtml = (html, assetMap) => {
  const sectionLabelMatch = html.match(/sectionsName\s*=\s*new\s+Array\(\s*'([^']+)'/i);
  const sectionId = inferSectionIdFromLabel(sectionLabelMatch?.[1] || "DILR");
  const qTypeValues = [...(html.match(/Qtype\s*=\s*new\s+Array\(([\s\S]*?)\);/i)?.[1] || "").matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const answerValues = [...(html.match(/ansKeyData\s*=\s*new\s+Array\(([\s\S]*?)\);/i)?.[1] || "").matchAll(/'([^']*)'/g)].map((m) => m[1]);
  const result = { VARC: [], DILR: [], QA: [] };
  const answers = createEmptyBySection(result, "");
  const solutions = createEmptyBySection(result, "");
  const instructionBlocks = [...html.matchAll(/<div id="insseq(\d+)" class="instructions"[^>]*>([\s\S]*?)<\/div>\s*<div id="qseq\1" class="questionbody"[^>]*>/gi)];
  instructionBlocks.forEach((match, idx) => {
    const sourceIndex = Number(match[1]);
    const instructionHtml = match[2] || "";
    const questionStart = (match.index ?? 0) + match[0].length;
    const nextInstructionIndex = idx + 1 < instructionBlocks.length ? (instructionBlocks[idx + 1].index ?? html.length) : html.length;
    const questionHtml = html.slice(questionStart, nextInstructionIndex);
    const questionNoMatch = questionHtml.match(/Question\s+No\s+(\d+)/i);
    const sourceQuestionNo = Number(questionNoMatch?.[1] || idx + 1);
    const questionTextMatch = questionHtml.match(/<span>([\s\S]*?)<\/span>/i);
    const optionMatches = [
      ...questionHtml.matchAll(/<td class="questionaligcont[^"]*">[\s\S]*?<b>\s*([1-4])\)\s*<\/b>\s*&nbsp;&nbsp;([\s\S]*?)<\/td>/gi),
    ];
    const options = optionMatches
      .map((opt) => ({ n: Number(opt[1]), t: normalizeBlockWithImages(opt[2], assetMap) }))
      .sort((a, b) => a.n - b.n)
      .map((opt) => opt.t);
    const type = qTypeValues[idx] === "sub" || !options.length ? "TITA" : "MCQ";
    const contextText = normalizeBlockWithImages(instructionHtml, assetMap);
    const solutionMatch = questionHtml.match(/<div class="solutiresultdiv">[\s\S]*?<\/div><div>([\s\S]*?)<\/div><div class=" bookfeedbtn"/i);
    const solutionText = solutionMatch ? normalizeBlockWithImages(solutionMatch[1], assetMap) : "";
    const rawAnswer = answerValues[sourceQuestionNo - 1] || answerValues[idx] || "";

    const question = {
      id: result[sectionId].length + 1,
      sourceQuestionNo,
      question: normalizeBlockWithImages(questionTextMatch?.[1] || "", assetMap),
      type,
    };
    if (type === "MCQ") question.options = options;
    if (contextText) {
      if (sectionId === "VARC") {
        question.isRC = true;
        question.passage = contextText;
      } else {
        question.setText = contextText;
      }
    }
    result[sectionId].push(question);
    answers[sectionId].push(type === "MCQ" && /^[1-4]$/.test(rawAnswer) ? String(Number(rawAnswer) - 1) : rawAnswer);
    solutions[sectionId].push(solutionText);
  });

  if (!result[sectionId].length) throw new Error("Could not parse questions from CL sectional HTML.");
  return { questionsData: result, answerKey: answers, answerSolutions: solutions, activeSectionIds: [sectionId] };
};

const extractOptionsFromTextBlock = (qText) => {
  const byLine = [...qText.matchAll(/(?:^|\n)\s*([1-4])[\.)]\s+(.+?)(?=(?:\n\s*[1-4][\.)]\s+)|$)/gms)]
    .map((m) => m[2].trim())
    .filter(Boolean);
  if (byLine.length >= 2) return byLine.slice(0, 4);
  const compact = [...qText.matchAll(/\b([1-4])[\.)]\s+(.+?)(?=\s+[1-4][\.)]\s+|$)/gms)]
    .map((m) => m[2].trim())
    .filter(Boolean);
  return compact.slice(0, 4);
};

const parseSectionalQuestionsFromPlainText = (text, sectionId) => {
  const normalized = text.replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n");
  const result = { VARC: [], DILR: [], QA: [] };
  const directionBlocks = [...normalized.matchAll(/Directions?\s+for\s+questions?\s*(\d+)\s*to\s*(\d+)\s*:\s*([\s\S]*?)(?=(?:Directions?\s+for\s+questions?\s*\d+\s*to\s*\d+\s*:)|(?:^|\n)\s*(?:Q(?:uestion)?\.?\s*)?\d+\b|$)/gim)]
    .map((m) => ({ start: Number(m[1]), end: Number(m[2]), text: m[0].trim() }));
  let qMatches = [...normalized.matchAll(/(?:^|\n)\s*(?:Q(?:uestion)?\.?\s*)?(\d{1,3})\b/gim)];
  if (!qMatches.length) {
    qMatches = [...normalized.matchAll(/\bQ(?:uestion)?\.?\s*(\d{1,3})\b/gim)];
  }
  if (!qMatches.length) {
    const genericParsed = parseQuestionsFromPlainText(normalized);
    const fallbackSection = genericParsed[sectionId] || [];
    if (fallbackSection.length) {
      result[sectionId] = fallbackSection.map((question, idx) => ({
        ...question,
        id: idx + 1,
        sourceQuestionNo: idx + 1,
      }));
      return result;
    }
    throw new Error(`Could not parse questions from ${sectionId} PDF.`);
  }

  qMatches.forEach((match, idx) => {
    const qNum = Number(match[1]);
    const start = match.index ?? 0;
    const end = idx + 1 < qMatches.length ? (qMatches[idx + 1].index ?? normalized.length) : normalized.length;
    const rawBlock = normalized.slice(start, end).replace(/^\s*(?:Q(?:uestion)?\.?\s*)?\d{1,3}\s*/i, "").trim();
    if (!rawBlock) return;
    const options = extractOptionsFromTextBlock(rawBlock);
    const question = {
      id: result[sectionId].length + 1,
      sourceQuestionNo: qNum,
      question: rawBlock,
      type: options.length ? "MCQ" : "TITA",
    };
    if (options.length) question.options = options;
    const direction = directionBlocks.find((block) => qNum >= block.start && qNum <= block.end);
    if (direction?.text) {
      if (sectionId === "VARC" && /passage|accompanied by a set of questions/i.test(direction.text)) {
        question.isRC = true;
        question.passage = direction.text;
      } else {
        question.setText = direction.text;
      }
    }
    result[sectionId].push(question);
  });

  return result;
};

const parseAnswerBundleFromPlainTextByQuestionNo = (text, questions) => {
  const answers = createEmptyBySection(questions, "");
  const solutions = createEmptyBySection(questions, "");
  const questionRefMap = {};
  ["VARC", "DILR", "QA"].forEach((sectionId) => {
    (questions[sectionId] || []).forEach((question, idx) => {
      if (question?.sourceQuestionNo) {
        questionRefMap[question.sourceQuestionNo] = { sectionId, idx, question };
      }
    });
  });

  const blocks = [...text.matchAll(/(?:^|\n)\s*(?:Q(?:uestion)?\.?\s*)?(\d{1,3})\b([\s\S]*?)(?=(?:^|\n)\s*(?:Q(?:uestion)?\.?\s*)?\d{1,3}\b|$)/gim)];
  blocks.forEach((block) => {
    const sourceQuestionNo = Number(block[1]);
    const ref = questionRefMap[sourceQuestionNo];
    if (!ref) return;
    const content = block[2] || "";
    const answerMatch = content.match(/Correct\s*Answer\s*:?\s*([0-9A-Za-z.\-]+)/i);
    if (!answerMatch) return;
    answers[ref.sectionId][ref.idx] = normalizeAnswerToken(answerMatch[1], ref.question);
    const solution = content.replace(/^[\s\S]*?Correct\s*Answer\s*:?\s*[0-9A-Za-z.\-]+\s*/i, "").trim();
    if (solution) solutions[ref.sectionId][ref.idx] = normalizeImportedText(solution);
  });

  const hasAny = ["VARC", "DILR", "QA"].some((sectionId) => answers[sectionId].some(Boolean));
  if (hasAny) return { answers, solutions };
  return {
    answers: parseAnswerKeyFromPlainText(text, questions),
    solutions: parseSolutionsFromPlainText(text, questions),
  };
};

const parseAnswerKeyFromJson = (text) => {
  const parsed = JSON.parse(text);
  if (!parsed || !parsed.VARC || !parsed.DILR || !parsed.QA) throw new Error("Answer key JSON must contain VARC, DILR, QA arrays.");
  return parsed;
};

const ensurePdfJs = () =>
  new Promise((resolve, reject) => {
    if (window.pdfjsLib) return resolve(window.pdfjsLib);
    const sources = [
      {
        script: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.min.js",
        worker: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.min.js",
      },
      {
        script: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
        worker: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
      },
      {
        script: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js",
        worker: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js",
      },
    ];

    const tryLoad = (idx) => {
      if (idx >= sources.length) {
        reject(new Error("Could not load PDF parser. Please check internet access or use HTML upload."));
        return;
      }

      const src = sources[idx];
      const script = document.createElement("script");
      script.src = src.script;
      script.async = true;
      script.onload = () => {
        if (!window.pdfjsLib) {
          tryLoad(idx + 1);
          return;
        }
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = src.worker;
        resolve(window.pdfjsLib);
      };
      script.onerror = () => tryLoad(idx + 1);
      document.head.appendChild(script);
    };

    tryLoad(0);
  });

const ensureTesseractJs = () =>
  new Promise((resolve, reject) => {
    if (window.Tesseract) return resolve(window.Tesseract);
    const existing = document.querySelector('script[data-tesseract-loader="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Tesseract), { once: true });
      existing.addEventListener("error", () => reject(new Error("Could not load OCR parser.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.async = true;
    script.dataset.tesseractLoader = "true";
    script.onload = () => {
      if (!window.Tesseract) {
        reject(new Error("Could not load OCR parser."));
        return;
      }
      resolve(window.Tesseract);
    };
    script.onerror = () => reject(new Error("Could not load OCR parser."));
    document.head.appendChild(script);
  });

const looksLikeScannedPdfText = (text) => {
  const value = String(text || "").trim();
  if (!value) return true;
  const lowered = value.toLowerCase();
  const noisyWatermarkHits = ["click to buy now", "pdf-xchange", "tracker-software"].filter((token) => lowered.includes(token)).length;
  const longWords = (value.match(/\b[A-Za-z]{4,}\b/g) || []).length;
  const singleLetters = (value.match(/\b[A-Za-z]\b/g) || []).length;
  return noisyWatermarkHits >= 2 || (longWords < 20 && singleLetters > 80);
};

const extractTextFromPdfWithOcr = async (file) => {
  const pdfjs = await ensurePdfJs();
  const Tesseract = await ensureTesseractJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  let content = "";

  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    const result = await Tesseract.recognize(canvas, "eng", {
      logger: () => {},
    });
    content += `${result?.data?.text || ""}\n\n`;
  }
  return content;
};

const extractTextFromPdf = async (file, options = {}) => {
  const pdfjs = await ensurePdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  let content = "";
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const textContent = await page.getTextContent();
    content += textContent.items.map((x) => x.str).join(" ") + "\n\n";
  }
  if (options.forceOcr || looksLikeScannedPdfText(content)) {
    return extractTextFromPdfWithOcr(file);
  }
  return content;
};

const parseQuestionsFromPlainText = (text) => {
  const normalized = text.replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n");
  const sectionsMap = { VARC: [], DILR: [], QA: [] };

  const parseOptions = (qText) => {
    const byLine = [...qText.matchAll(/(?:^|\n)\s*([1-4])[\.)]\s+(.+?)(?=(?:\n\s*[1-4][\.)]\s+)|$)/gms)]
      .map((m) => m[2].trim())
      .filter(Boolean);
    if (byLine.length >= 2) return byLine.slice(0, 4);
    const compact = [...qText.matchAll(/\b([1-4])[\.)]\s+(.+?)(?=\s+[1-4][\.)]\s+|$)/gms)]
      .map((m) => m[2].trim())
      .filter(Boolean);
    return compact.slice(0, 4);
  };

  const buildQuestion = (qText, section) => {
    const cleaned = qText.trim();
    const options = parseOptions(cleaned);
    const type = options.length ? "MCQ" : "TITA";
    const obj = { id: sectionsMap[section].length + 1, question: cleaned, type };
    if (options.length) obj.options = options;
    return obj;
  };

  const pickSectionFromLabel = (label) => {
    const l = label.toUpperCase();
    if (l.includes("DILR") || l.includes("DATA INTERPRETATION")) return "DILR";
    if (l.includes("QA") || l.includes("QUANT")) return "QA";
    return "VARC";
  };

  const secSplits = normalized.split(/\b(VARC|DILR|QA|Quantitative Aptitude|Reading Comprehension|Data Interpretation\s*&?\s*Logical Reasoning)\b/gi);
  for (let i = 1; i < secSplits.length; i += 2) {
    const sec = pickSectionFromLabel(secSplits[i]);
    const body = secSplits[i + 1] || "";
    const qParts = body.split(/\b(?:Q(?:uestion)?\.?\s*)?(\d{1,3})\b/gi);
    for (let j = 1; j < qParts.length; j += 2) {
      const qText = qParts[j + 1] || "";
      if (!qText.trim()) continue;
      sectionsMap[sec].push(buildQuestion(qText, sec));
    }
  }

  if (["VARC", "DILR", "QA"].every((sec) => sectionsMap[sec].length > 0)) return sectionsMap;

  // Fallback for PDFs where section labels are missing: map by question numbers (CAT standard 24/20/22).
  const qMatches = [...normalized.matchAll(/(?:^|\n|\s)(?:Q(?:uestion)?\.?\s*)?(\d{1,3})\b/g)];
  if (!qMatches.length) return sectionsMap;

  for (let i = 0; i < qMatches.length; i += 1) {
    const qNum = Number(qMatches[i][1]);
    if (!Number.isFinite(qNum) || qNum < 1 || qNum > 200) continue;
    const start = qMatches[i].index ?? 0;
    const end = i + 1 < qMatches.length ? (qMatches[i + 1].index ?? normalized.length) : normalized.length;
    const qText = normalized.slice(start, end).replace(/^(?:\s*Q(?:uestion)?\.?\s*)?\d{1,3}\s*/i, "").trim();
    if (!qText) continue;

    let sec = "QA";
    if (qNum <= 24) sec = "VARC";
    else if (qNum <= 44) sec = "DILR";
    const obj = buildQuestion(qText, sec);
    if (sec === "VARC" && /passage|accompanied by a set of questions/i.test(qText)) obj.isRC = true;
    sectionsMap[sec].push(obj);
  }

  return sectionsMap;
};

const repartitionQuestionsByCatPattern = (parsedQuestions) => {
  const flat = ["VARC", "DILR", "QA"]
    .flatMap((sec) => parsedQuestions?.[sec] || [])
    .filter((q) => q && q.question);
  if (!flat.length) return parsedQuestions;

  const mk = (arr) => arr.map((q, idx) => ({ ...q, id: idx + 1 }));
  const varc = mk(flat.slice(0, 24));
  const dilr = mk(flat.slice(24, 44));
  const qa = mk(flat.slice(44));
  return { VARC: varc, DILR: dilr, QA: qa };
};

const parseAnswerKeyFromPlainText = (text, questions) => {
  const tokens = [...text.matchAll(/\b(?:Correct\s*Answer\s*:?\s*)?([0-9]{1,4})\b/gi)].map((m) => m[1]);
  if (!tokens.length) throw new Error("No answer key values found in provided file.");
  const mapped = { VARC: [], DILR: [], QA: [] };
  let idx = 0;
  ["VARC", "DILR", "QA"].forEach((sec) => {
    const n = questions[sec]?.length || 0;
    for (let i = 0; i < n; i += 1) {
      const raw = tokens[idx] ?? "";
      idx += 1;
      if (/^[1-4]$/.test(raw) && questions[sec][i]?.type === "MCQ") mapped[sec].push(String(Number(raw) - 1));
      else mapped[sec].push(raw);
    }
  });
  return mapped;
};

const parseSolutionsFromPlainText = (text, questions) => {
  const mapped = createEmptyBySection(questions, "");
  const parts = [...text.matchAll(/Correct\s*Answer\s*:?\s*[0-9]{1,4}\s*([\s\S]*?)(?=Correct\s*Answer\s*:|$)/gi)]
    .map((m) => normalizeImportedText(m[1]).trim())
    .filter(Boolean);
  let idx = 0;
  ["VARC", "DILR", "QA"].forEach((sec) => {
    const n = questions[sec]?.length || 0;
    for (let i = 0; i < n; i += 1) {
      mapped[sec][i] = parts[idx] || "";
      idx += 1;
    }
  });
  return mapped;
};

const readTextFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ""));
  reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
  reader.readAsText(file);
});
function WatermarkLayer({ name }) {
  return (
    <div className="watermark-layer" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <span key={i} className="watermark-item">{name}</span>
      ))}
    </div>
  );
}

function OnboardingPage({ onStart, loading, error }) {
  const [name, setName] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [sourceFormat, setSourceFormat] = useState("GENERIC");
  const [imsFile, setImsFile] = useState(null);
  const [questionFile, setQuestionFile] = useState(null);
  const [answerFile, setAnswerFile] = useState(null);
  const [testMode, setTestMode] = useState("FULL");
  const [preferredSection, setPreferredSection] = useState("VARC");
  const [clHtmlFile, setClHtmlFile] = useState(null);
  const [clAssetFiles, setClAssetFiles] = useState([]);
  const [timeMode, setTimeMode] = useState("SECTIONAL");
  const [timeSection, setTimeSection] = useState("DILR");
  const [timeSectionalPdf, setTimeSectionalPdf] = useState(null);
  const [timeVarcPdf, setTimeVarcPdf] = useState(null);
  const [timeDilrPdf, setTimeDilrPdf] = useState(null);
  const [timeQaPdf, setTimeQaPdf] = useState(null);
  const [timeAnswerPdf, setTimeAnswerPdf] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (cancelled) return;
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {}
    };
    init();
    return () => {
      cancelled = true;
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPhotoDataUrl(canvas.toDataURL("image/png"));
  };

  const handleStart = () => {
    if (!name.trim()) return onStart({ error: "Please enter your name." });
    if (!photoDataUrl) return onStart({ error: "Please capture your image using webcam." });
    onStart({
      name: name.trim(),
      image: photoDataUrl,
      sourceFormat,
      imsFile,
      questionFile,
      answerFile,
      testMode,
      preferredSection,
      clHtmlFile,
      clAssetFiles,
      timeMode,
      timeSection,
      timeSectionalPdf,
      timeVarcPdf,
      timeDilrPdf,
      timeQaPdf,
      timeAnswerPdf,
    });
  };

  return (
    <div className="start-shell">
      <div className="start-card">
        <h1>CAT 2026 MOCK TEST</h1>
        <p>Enter your details, capture image, and upload question paper + answer key files.</p>

        <label className="start-label" htmlFor="candidate-name">Candidate Name</label>
        <input id="candidate-name" className="start-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" />

        <div className="camera-wrap">
          <video ref={videoRef} className="camera-video" playsInline muted />
          <canvas ref={canvasRef} className="camera-canvas" />
          {photoDataUrl && <img src={photoDataUrl} alt="Captured" className="camera-preview" />}
        </div>

        <button type="button" className="start-btn secondary" onClick={capturePhoto}>Capture Image</button>

        <label className="start-label" htmlFor="source-format">Import Format</label>
        <select id="source-format" className="start-input start-select" value={sourceFormat} onChange={(e) => setSourceFormat(e.target.value)}>
          <option value="GENERIC">Generic HTML / PDF / IMS</option>
          <option value="CL_SECTIONAL">CL Sectional HTML</option>
          <option value="TIME_PDF">TIME Sectional / Full-Length PDFs</option>
        </select>

        {sourceFormat === "GENERIC" && (
          <>
            <div className="start-mode-grid">
              <div>
                <label className="start-label" htmlFor="test-mode">Test Type</label>
                <select id="test-mode" className="start-input start-select" value={testMode} onChange={(e) => setTestMode(e.target.value)}>
                  <option value="FULL">Full Length Mock</option>
                  <option value="SECTIONAL">Sectional Test</option>
                </select>
              </div>
              {testMode === "SECTIONAL" && (
                <div>
                  <label className="start-label" htmlFor="preferred-section">Section Preference</label>
                  <select
                    id="preferred-section"
                    className="start-input start-select"
                    value={preferredSection}
                    onChange={(e) => setPreferredSection(e.target.value)}
                  >
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>{section.id}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <label className="start-label" htmlFor="ims-upload">Upload IMS Reviewed Test HTML (Optional)</label>
            <input id="ims-upload" className="start-file" type="file" accept=".html,.htm" onChange={(e) => setImsFile(e.target.files?.[0] || null)} />

            <label className="start-label" htmlFor="questions-upload">Upload Questions File (HTML/PDF)</label>
            <input id="questions-upload" className="start-file" type="file" accept=".html,.htm,.pdf" onChange={(e) => setQuestionFile(e.target.files?.[0] || null)} />

            <label className="start-label" htmlFor="answers-upload">Upload Answer Key File (HTML/PDF/JSON/TXT)</label>
            <input id="answers-upload" className="start-file" type="file" accept=".html,.htm,.pdf,.json,.txt" onChange={(e) => setAnswerFile(e.target.files?.[0] || null)} />
          </>
        )}

        {sourceFormat === "CL_SECTIONAL" && (
          <>
            <p className="start-helper">Upload the CL reviewed sectional HTML. If it uses a sibling `*_files` folder, upload those image files too so the diagrams and solutions appear correctly.</p>
            <label className="start-label" htmlFor="cl-html-upload">Upload CL Sectional HTML</label>
            <input id="cl-html-upload" className="start-file" type="file" accept=".html,.htm" onChange={(e) => setClHtmlFile(e.target.files?.[0] || null)} />

            <label className="start-label" htmlFor="cl-assets-upload">Upload CL Asset Folder Contents</label>
            <input id="cl-assets-upload" className="start-file" type="file" multiple accept=".jpg,.jpeg,.png,.gif,.webp,.svg" onChange={(e) => setClAssetFiles(Array.from(e.target.files || []))} />
          </>
        )}

        {sourceFormat === "TIME_PDF" && (
          <>
            <div className="start-mode-grid">
              <div>
                <label className="start-label" htmlFor="time-mode">TIME Test Type</label>
                <select id="time-mode" className="start-input start-select" value={timeMode} onChange={(e) => setTimeMode(e.target.value)}>
                  <option value="SECTIONAL">Sectional Test</option>
                  <option value="FULL">Full Length Test</option>
                </select>
              </div>
              {timeMode === "SECTIONAL" && (
                <div>
                  <label className="start-label" htmlFor="time-section">Section</label>
                  <select id="time-section" className="start-input start-select" value={timeSection} onChange={(e) => setTimeSection(e.target.value)}>
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>{section.id}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {timeMode === "SECTIONAL" ? (
              <>
                <label className="start-label" htmlFor="time-sectional-pdf">Upload TIME Sectional PDF</label>
                <input id="time-sectional-pdf" className="start-file" type="file" accept=".pdf" onChange={(e) => setTimeSectionalPdf(e.target.files?.[0] || null)} />
              </>
            ) : (
              <div className="start-mode-grid">
                <div>
                  <label className="start-label" htmlFor="time-varc-pdf">Upload TIME VARC PDF</label>
                  <input id="time-varc-pdf" className="start-file" type="file" accept=".pdf" onChange={(e) => setTimeVarcPdf(e.target.files?.[0] || null)} />
                </div>
                <div>
                  <label className="start-label" htmlFor="time-dilr-pdf">Upload TIME DILR PDF</label>
                  <input id="time-dilr-pdf" className="start-file" type="file" accept=".pdf" onChange={(e) => setTimeDilrPdf(e.target.files?.[0] || null)} />
                </div>
                <div>
                  <label className="start-label" htmlFor="time-qa-pdf">Upload TIME QA PDF</label>
                  <input id="time-qa-pdf" className="start-file" type="file" accept=".pdf" onChange={(e) => setTimeQaPdf(e.target.files?.[0] || null)} />
                </div>
              </div>
            )}

            <label className="start-label" htmlFor="time-answer-pdf">Upload Common TIME Answer Key PDF</label>
            <input id="time-answer-pdf" className="start-file" type="file" accept=".pdf" onChange={(e) => setTimeAnswerPdf(e.target.files?.[0] || null)} />
          </>
        )}

        {error && <div className="start-error">{error}</div>}
        <button type="button" className="start-btn" onClick={handleStart} disabled={loading}>{loading ? "Loading..." : "Start Mock Test"}</button>
      </div>
    </div>
  );
}

function App() {
  const [isStarted, setIsStarted] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [startError, setStartError] = useState("");
  const [candidateName, setCandidateName] = useState("John Smith");
  const [candidateImage, setCandidateImage] = useState(AVATAR_IMAGE);
  const [testMode, setTestMode] = useState("FULL");
  const [activeSections, setActiveSections] = useState(sections);
  const [examData, setExamData] = useState(defaultExamBundle);

  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [review, setReview] = useState([]);
  const [visited, setVisited] = useState({});
  const [selected, setSelected] = useState("");
  const [completed, setCompleted] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(getSectionDuration(sections, 0));
  const [finalScores, setFinalScores] = useState(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const timeoutHandledRef = useRef(false);
  const questionBodyRef = useRef(null);

  const currentSection = activeSections[currentSectionIdx] || activeSections[0] || sections[0];
  const questionList = examData.questionsData[currentSection.id] || [];
  const q = questionList[currentQ] || {};
  const key = `${currentSection.id}-${currentQ}`;
  const isTwoPaneLayout = currentSection.id === "DILR" || (currentSection.id === "VARC" && q?.isRC);

  const handleStart = async ({
    name,
    image,
    error,
    sourceFormat,
    imsFile,
    questionFile,
    answerFile,
    testMode: nextTestMode,
    preferredSection,
    clHtmlFile,
    clAssetFiles,
    timeMode,
    timeSection,
    timeSectionalPdf,
    timeVarcPdf,
    timeDilrPdf,
    timeQaPdf,
    timeAnswerPdf,
  }) => {
    if (error) return setStartError(error);
    setStartLoading(true);
    setStartError("");
    try {
      let parsedQuestions = defaultQuestionsData;
      let parsedAnswers = defaultAnswerKey;
      let parsedSolutions = createEmptyBySection(parsedQuestions, "");
      let activeSectionIds = sections.map((section) => section.id);
      let runtimeMode = nextTestMode;

      if (sourceFormat === "CL_SECTIONAL") {
        if (!clHtmlFile) throw new Error("Please upload the CL sectional HTML file.");
        const clBundle = parseClSectionalHtml(await readTextFile(clHtmlFile), await buildAssetMap(clAssetFiles));
        parsedQuestions = clBundle.questionsData;
        parsedAnswers = clBundle.answerKey;
        parsedSolutions = clBundle.answerSolutions;
        activeSectionIds = clBundle.activeSectionIds;
        runtimeMode = "SECTIONAL";
      } else if (sourceFormat === "TIME_PDF") {
        if (!timeAnswerPdf) throw new Error("Please upload the common TIME answer key PDF.");
        const timeQuestionMap = { VARC: [], DILR: [], QA: [] };
        if (timeMode === "SECTIONAL") {
          if (!timeSectionalPdf) throw new Error("Please upload the TIME sectional test PDF.");
          timeQuestionMap[timeSection] = parseSectionalQuestionsFromPlainText(await extractTextFromPdf(timeSectionalPdf), timeSection)[timeSection];
          activeSectionIds = [timeSection];
          runtimeMode = "SECTIONAL";
        } else {
          if (!timeVarcPdf || !timeDilrPdf || !timeQaPdf) {
            throw new Error("Please upload all three TIME sectional PDFs for full-length mode.");
          }
          timeQuestionMap.VARC = parseSectionalQuestionsFromPlainText(await extractTextFromPdf(timeVarcPdf), "VARC").VARC;
          timeQuestionMap.DILR = parseSectionalQuestionsFromPlainText(await extractTextFromPdf(timeDilrPdf), "DILR").DILR;
          timeQuestionMap.QA = parseSectionalQuestionsFromPlainText(await extractTextFromPdf(timeQaPdf), "QA").QA;
          activeSectionIds = ["VARC", "DILR", "QA"];
          runtimeMode = "FULL";
        }
        parsedQuestions = timeQuestionMap;
        parsedSolutions = createEmptyBySection(parsedQuestions, "");
        const answerText = await extractTextFromPdf(timeAnswerPdf);
        const timeAnswerBundle = parseAnswerBundleFromPlainTextByQuestionNo(answerText, parsedQuestions);
        parsedAnswers = timeAnswerBundle.answers;
        parsedSolutions = timeAnswerBundle.solutions;
      } else {
        const requestedSections = nextTestMode === "SECTIONAL" ? [preferredSection] : sections.map((section) => section.id);

        if (imsFile) {
          const imsHtml = await readTextFile(imsFile);
          const imsBundle = parseImsBundleFromHtml(imsHtml);
          parsedQuestions = imsBundle.questionsData;
          parsedAnswers = imsBundle.answerKey;
          parsedSolutions = imsBundle.answerSolutions;
        }

        if (!imsFile && questionFile) {
          const ext = questionFile.name.toLowerCase();
          const isPdfQuestion = ext.endsWith(".pdf");
          parsedQuestions = ext.endsWith(".pdf")
            ? parseQuestionsFromPlainText(await extractTextFromPdf(questionFile))
            : parseQuestionsFromHtml(await readTextFile(questionFile));

          const hasAllSections = ["VARC", "DILR", "QA"].every((sec) => parsedQuestions[sec]?.length);
          const hasPreferredSection = preferredSection ? (parsedQuestions[preferredSection]?.length || 0) > 0 : false;

          if (!hasAllSections && !hasPreferredSection) {
            parsedQuestions = repartitionQuestionsByCatPattern(parsedQuestions);
          }

          const fullLengthReady = ["VARC", "DILR", "QA"].every((sec) => parsedQuestions[sec]?.length);
          const sectionalReady = preferredSection ? (parsedQuestions[preferredSection]?.length || 0) > 0 : false;

          if (nextTestMode === "FULL" && !fullLengthReady) {
            if (isPdfQuestion) {
              throw new Error("Could not parse all sections from question PDF. This file may be scanned/image-only. Please upload HTML or a text-based PDF.");
            }
            throw new Error("Could not parse all sections from question file.");
          }

          if (nextTestMode === "SECTIONAL" && !sectionalReady) {
            if (isPdfQuestion) {
              throw new Error(`Could not parse usable ${preferredSection} questions from the uploaded PDF. Please upload HTML or a text-based PDF for that section.`);
            }
            throw new Error(`Could not parse usable ${preferredSection} questions from the uploaded question file.`);
          }
          parsedSolutions = createEmptyBySection(parsedQuestions, "");
        }

        if (answerFile) {
          const ext = answerFile.name.toLowerCase();
          if (ext.endsWith(".json")) parsedAnswers = parseAnswerKeyFromJson(await readTextFile(answerFile));
          else if (ext.endsWith(".pdf")) {
            const txt = await extractTextFromPdf(answerFile);
            parsedAnswers = parseAnswerKeyFromPlainText(txt, parsedQuestions);
            parsedSolutions = parseSolutionsFromPlainText(txt, parsedQuestions);
          }
          else {
            const txt = await readTextFile(answerFile);
            if (/<html|<table|Correct\s*Answer/i.test(txt)) {
              const bundle = parseAnswerBundleFromHtml(txt, parsedQuestions);
              parsedAnswers = bundle.answers;
              parsedSolutions = bundle.solutions;
            } else {
              parsedAnswers = parseAnswerKeyFromPlainText(txt, parsedQuestions);
              parsedSolutions = parseSolutionsFromPlainText(txt, parsedQuestions);
            }
          }
        }

        const availableSections = sections.filter((section) => (parsedQuestions[section.id] || []).length > 0);
        activeSectionIds = nextTestMode === "SECTIONAL"
          ? requestedSections.filter((sectionId) => (parsedQuestions[sectionId] || []).length > 0)
          : availableSections.map((section) => section.id);
      }

      if (!activeSectionIds.length) {
        if (runtimeMode === "SECTIONAL") {
          throw new Error(`The uploaded files do not contain usable ${preferredSection || timeSection} questions.`);
        }
        throw new Error("Could not find any usable sections in the uploaded files.");
      }

      const examBundle = buildExamSubset(
        {
          questionsData: parsedQuestions,
          answerKey: parsedAnswers,
          answerSolutions: parsedSolutions,
        },
        activeSectionIds
      );
      const runtimeSections = activeSectionIds.map((sectionId) => sectionLookup[sectionId]);

      setCandidateName(name);
      setCandidateImage(image || AVATAR_IMAGE);
      setTestMode(runtimeMode);
      setActiveSections(runtimeSections);
      setExamData(examBundle);
      setCurrentSectionIdx(0);
      setCurrentQ(0);
      setAnswers({});
      setReview([]);
      setVisited({});
      setSelected("");
      setCompleted(false);
      setReviewMode(false);
      setTimeLeft(getSectionDuration(runtimeSections, 0));
      setFinalScores(null);
      timeoutHandledRef.current = false;
      setIsStarted(true);
    } catch (e) {
      setStartError(e.message || "Could not process uploaded files.");
    } finally {
      setStartLoading(false);
    }
  };
  useEffect(() => {
    if (isStarted) setVisited((prev) => ({ ...prev, [key]: true }));
  }, [key, isStarted]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!isStarted || completed) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isStarted, completed]);

  useEffect(() => {
    if (isStarted) setSelected(answers[key] ?? "");
  }, [answers, key, isStarted]);

  useEffect(() => {
    if (!isStarted || completed) return undefined;
    const timer = setInterval(() => setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [completed, isStarted]);

  const getMergedAnswers = () => {
    const merged = { ...answers };
    if (selected === "") delete merged[key];
    else merged[key] = selected;
    return merged;
  };

  const calculateScores = (allAnswers) => {
    const sectionScores = activeSections.map((section) => {
      const qList = examData.questionsData[section.id] || [];
      let score = 0;
      let correct = 0;
      let incorrect = 0;
      let unattempted = 0;
      qList.forEach((question, idx) => {
        const userAnswer = allAnswers[`${section.id}-${idx}`];
        const correctAnswer = examData.answerKey[section.id]?.[idx];
        if (userAnswer === undefined || userAnswer === "") {
          unattempted += 1;
          return;
        }
        if (correctAnswer === undefined || correctAnswer === "") {
          unattempted += 1;
          return;
        }
        if (String(userAnswer).trim() === String(correctAnswer).trim()) {
          score += 3;
          correct += 1;
        } else {
          incorrect += 1;
          if (question.type === "MCQ") score -= 1;
        }
      });
      return { section: section.id, score, total: qList.length * 3, correct, incorrect, unattempted };
    });
    return { sectionScores, overall: sectionScores.reduce((sum, item) => sum + item.score, 0) };
  };

  const finalizeTest = (allAnswers) => {
    try {
      localStorage.setItem("cat_mock_saved_responses", JSON.stringify({ savedAt: new Date().toISOString(), answers: allAnswers }));
    } catch {}
    setAnswers(allAnswers);
    setFinalScores(calculateScores(allAnswers));
    setCompleted(true);
  };

  useEffect(() => {
    if (!isStarted) return;
    if (timeLeft > 0) {
      timeoutHandledRef.current = false;
      return;
    }
    if (completed || timeoutHandledRef.current) return;
    timeoutHandledRef.current = true;
    const mergedAnswers = getMergedAnswers();
    setAnswers(mergedAnswers);
    if (currentSectionIdx < activeSections.length - 1) {
      setCurrentSectionIdx((prev) => prev + 1);
      setCurrentQ(0);
      setTimeLeft(getSectionDuration(activeSections, currentSectionIdx + 1));
      return;
    }
    finalizeTest(mergedAnswers);
  }, [timeLeft, completed, currentSectionIdx, answers, selected, key, isStarted, activeSections]);

  const getStatus = (questionIndex) => {
    const qKey = `${currentSection.id}-${questionIndex}`;
    const isAnswered = answers[qKey] !== undefined && answers[qKey] !== "";
    const isReview = review.includes(qKey);
    const isVisited = visited[qKey];
    if (isReview && isAnswered) return "answered-review";
    if (isReview) return "review";
    if (isAnswered) return "answered";
    if (isVisited) return "not-answered";
    return "not-visited";
  };

  const counts = useMemo(() => {
    let answered = 0, notAnswered = 0, notVisited = 0, markedReview = 0, answeredReview = 0;
    questionList.forEach((_, idx) => {
      const status = getStatus(idx);
      if (status === "answered") answered += 1;
      if (status === "not-answered") notAnswered += 1;
      if (status === "not-visited") notVisited += 1;
      if (status === "review") markedReview += 1;
      if (status === "answered-review") answeredReview += 1;
    });
    return { answered, notAnswered, notVisited, markedReview, answeredReview };
  }, [questionList, answers, review, visited, currentSection.id]);

  const handleSaveAndNext = () => {
    setAnswers(getMergedAnswers());
    setReview((prev) => prev.filter((item) => item !== key));
    if (currentQ < questionList.length - 1) setCurrentQ((prev) => prev + 1);
  };

  const handleMarkAndNext = () => {
    setAnswers(getMergedAnswers());
    setReview((prev) => (prev.includes(key) ? prev : [...prev, key]));
    if (currentQ < questionList.length - 1) setCurrentQ((prev) => prev + 1);
  };

  const handleClearResponse = () => {
    setSelected("");
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setReview((prev) => prev.filter((item) => item !== key));
  };

  const handleSubmitSection = () => {
    const mergedAnswers = getMergedAnswers();
    if (currentSectionIdx < activeSections.length - 1) {
      if (!window.confirm(`Submit ${currentSection.id} and move to ${activeSections[currentSectionIdx + 1].id}?`)) return;
      setAnswers(mergedAnswers);
      setCurrentSectionIdx((prev) => prev + 1);
      setCurrentQ(0);
      setTimeLeft(getSectionDuration(activeSections, currentSectionIdx + 1));
      return;
    }
    if (!window.confirm(`Submit ${currentSection.id} and finish the test?`)) return;
    finalizeTest(mergedAnswers);
  };

  const scrollQuestionPaneToTop = () => {
    if (questionBodyRef.current) questionBodyRef.current.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!isStarted) return <OnboardingPage onStart={handleStart} loading={startLoading} error={startError} />;
  if (completed && reviewMode) {
    return (
      <ReviewPage
        activeSections={activeSections}
        answers={answers}
        questionsData={examData.questionsData}
        answerKey={examData.answerKey}
        answerSolutions={examData.answerSolutions}
        candidateName={candidateName}
        candidateImage={candidateImage}
        onBackToScore={() => setReviewMode(false)}
      />
    );
  }
  if (completed && !reviewMode) {
    return <ScorePage results={finalScores ?? calculateScores(answers)} onReview={() => setReviewMode(true)} testMode={testMode} />;
  }

  return (
    <div className="exam-shell">
      <div className="exam-top-dark">
        <div className="exam-link">CAT 2026 MOCK TEST</div>
        <div className="exam-top-right">
          <span>Question Paper</span>
          <span className="top-divider">|</span>
          <span>Instructions</span>
        </div>
      </div>
      <div className="exam-layout">
        <main className="exam-main">
          <div className="section-tabs-row">
            <div className="section-tabs">
              {activeSections.map((section, idx) => (
                <button key={section.id} className={`section-tab ${idx === currentSectionIdx ? "active" : ""}`} disabled={idx !== currentSectionIdx} type="button">{section.id}</button>
              ))}
            </div>
            <div className="top-tools">
              <button type="button" className={`tool-btn ${isCalculatorOpen ? "active" : ""}`} onClick={() => setIsCalculatorOpen((prev) => !prev)} title="Calculator">
                <img src={CALCULATOR_ICON} alt="Calculator" className="calc-icon" />
              </button>
            </div>
          </div>
          <div className="section-strip">
            <div className="section-label">Sections</div>
            <div className="section-name">{currentSection.subsection}</div>
            <div className="time-left">Time Left : {formatClock(timeLeft)}</div>
          </div>
          <div className="marks-strip">Marks for correct answer <strong>3</strong> | Negative Marks <strong>1</strong> (MCQ only)</div>
          <div className={`question-pane ${isTwoPaneLayout ? "" : "single-pane"}`}>
            <WatermarkLayer name={candidateName} />
            {isTwoPaneLayout && (
              <div className="passage-pane">
                {(q?.isRC ? ensureRcParagraphs(toParagraphs(q.passage || q.setText || "")) : toParagraphs(q.passage || q.setText || "")).map((para, idx) => (
                  <div key={`${q.id}-para-${idx}`} className="rich-para">{renderInlineMedia(para, `${q.id}-para-${idx}`)}</div>
                ))}
              </div>
            )}
            <div ref={questionBodyRef} className={`question-body ${isTwoPaneLayout ? "" : "full-width"}`}>
              <h3>Question No. {currentQ + 1}</h3>
              {formatQuestionParagraphs(q.question).map((para, idx) => <div key={`${q.id}-qpara-${idx}`} className="rich-para">{renderInlineMedia(para, `${q.id}-qpara-${idx}`)}</div>)}
              {q.options && (
                <div className="options-list">
                  {q.options.map((option, idx) => (
                    <label key={`${q.id}-opt-${idx}`} className="option-row">
                      <input type="radio" name={`q-${q.id}`} checked={selected === String(idx)} onChange={() => setSelected(String(idx))} />
                      <span>{renderInlineMedia(option, `${q.id}-opt-${idx}`)}</span>
                    </label>
                  ))}
                </div>
              )}
              {q.type === "TITA" && (
                <div className="tita-box">
                  <label htmlFor="tita-answer">Enter Answer</label>
                  <input id="tita-answer" type="text" value={selected} readOnly placeholder="Use keypad below" />
                  <div className="tita-pad-wrap"><VirtualKeypad value={selected} setValue={setSelected} /></div>
                </div>
              )}
              <button type="button" className="scroll-top-btn question-scroll-top" onClick={scrollQuestionPaneToTop} title="Scroll to top">
                {"\u2191"}
              </button>
            </div>
          </div>
          <div className="action-bar">
            <button className="btn ghost" onClick={handleMarkAndNext}>Mark for Review & Next</button>
            <button className="btn ghost" onClick={handleClearResponse}>Clear Response</button>
            <button className="btn primary" onClick={handleSaveAndNext}>Save & Next</button>
          </div>
          {isCalculatorOpen && (
            <div className="calculator-pop">
              <div className="calculator-head">
                <span>Calculator</span>
                <button type="button" className="calc-close" onClick={() => setIsCalculatorOpen(false)}>x</button>
              </div>
              <VirtualCalculator />
            </div>
          )}
        </main>
        <aside className="exam-sidebar">
          <div className="profile-row">
            <div className="avatar-box"><img src={candidateImage || AVATAR_IMAGE} alt={candidateName} /></div>
            <div className="candidate-name">{candidateName}</div>
          </div>
          <div className="legend-card">
            <div className="legend-item"><span className="legend-chip answered">{counts.answered}</span><span>Answered</span></div>
            <div className="legend-item"><span className="legend-chip not-answered">{counts.notAnswered}</span><span>Not Answered</span></div>
            <div className="legend-item"><span className="legend-chip not-visited">{counts.notVisited}</span><span>Not Visited</span></div>
            <div className="legend-item"><span className="legend-chip review">{counts.markedReview}</span><span>Marked for Review</span></div>
            <div className="legend-item"><span className="legend-chip answered-review">{counts.answeredReview}</span><span>Answered & Marked for Review</span></div>
          </div>
          <div className="palette-title">{currentSection.subsection}</div>
          <div className="palette-card">
            <div className="choose-label">Choose a Question</div>
            <div className="palette-grid">
              {questionList.map((question, idx) => (
                <button key={question.id} className={`q-cell ${getStatus(idx)} ${currentQ === idx ? "current" : ""}`} onClick={() => setCurrentQ(idx)}>
                  {idx + 1}
                  {getStatus(idx) === "answered-review" && <span className="q-cell-dot" />}
                </button>
              ))}
            </div>
          </div>
          <div className="sidebar-submit-wrap">
            <button className="sidebar-submit-btn" type="button" onClick={handleSubmitSection}>{currentSectionIdx < activeSections.length - 1 ? "Submit Section" : "Submit"}</button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ScorePage({ results, onReview, testMode }) {
  return (
    <div className="result-page">
      <h1>{testMode === "SECTIONAL" ? "Sectional Test Completed" : "Test Completed"}</h1>
      <div className="score-table-wrap">
        <table className="score-table">
          <thead>
            <tr>
              <th>Section</th>
              <th>Correct</th>
              <th>Incorrect</th>
              <th>Unattempted</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {results.sectionScores.map((item) => (
              <tr key={item.section}>
                <td>{item.section}</td>
                <td>{item.correct}</td>
                <td>{item.incorrect}</td>
                <td>{item.unattempted}</td>
                <td>{item.score} / {item.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="overall-score"><strong>Overall Score: {results.overall}</strong></p>
      <button onClick={onReview}>Review Your Answers</button>
    </div>
  );
}

function ReviewPage({ activeSections, answers, questionsData, answerKey, answerSolutions, candidateName, candidateImage, onBackToScore }) {
  const [openSolutions, setOpenSolutions] = useState({});
  const [openCorrectAnswers, setOpenCorrectAnswers] = useState({});
  const [reviewSectionIdx, setReviewSectionIdx] = useState(0);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const reviewQuestionBodyRef = useRef(null);

  const toggleSolution = (key) => {
    setOpenSolutions((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const toggleCorrectAnswer = (key) => {
    setOpenCorrectAnswers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const displayAnswer = (question, value) => {
    if (value === undefined || value === null || value === "") return "Unattempted";
    if (question.type !== "MCQ") return String(value);
    const idx = Number(value);
    const text = question.options?.[idx];
    if (Number.isNaN(idx) || !text) return String(value);
    return `Option ${idx + 1}: ${text}`;
  };

  const statusFor = (question, user, correct) => {
    if (user === undefined || user === "") return "unattempted";
    return String(user).trim() === String(correct).trim() ? "correct" : "incorrect";
  };

  const currentSection = activeSections[reviewSectionIdx] || activeSections[0];
  const currentSectionQuestions = questionsData[currentSection.id] || [];

  useEffect(() => {
    setActiveQuestionIdx(0);
  }, [reviewSectionIdx]);

  const jumpToQuestion = (idx) => {
    setActiveQuestionIdx(idx);
  };

  const selectedQuestion = currentSectionQuestions[activeQuestionIdx] || {};
  const selectedUserAnswer = answers[`${currentSection.id}-${activeQuestionIdx}`];
  const selectedCorrectAnswer = answerKey[currentSection.id]?.[activeQuestionIdx];
  const selectedQKey = `${currentSection.id}-${activeQuestionIdx}`;
  const selectedStatus = statusFor(selectedQuestion, selectedUserAnswer, selectedCorrectAnswer);
  const selectedSolutionText = answerSolutions?.[currentSection.id]?.[activeQuestionIdx] || "";
  const selectedContextText = selectedQuestion.passage || selectedQuestion.setText || "";
  const isTwoPaneLayout = currentSection.id === "DILR" || (currentSection.id === "VARC" && selectedQuestion?.isRC);

  const paletteStatusClass = (idx) => {
    const question = currentSectionQuestions[idx];
    const userAnswer = answers[`${currentSection.id}-${idx}`];
    const correctAnswer = answerKey[currentSection.id]?.[idx];
    const status = statusFor(question, userAnswer, correctAnswer);
    if (status === "correct") return "review-correct";
    if (status === "incorrect") return "review-wrong";
    return "review-unattempted";
  };

  const sectionCounts = (() => {
    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;
    currentSectionQuestions.forEach((question, idx) => {
      const userAnswer = answers[`${currentSection.id}-${idx}`];
      const correctAnswer = answerKey[currentSection.id]?.[idx];
      const status = statusFor(question, userAnswer, correctAnswer);
      if (status === "correct") correct += 1;
      else if (status === "incorrect") incorrect += 1;
      else unattempted += 1;
    });
    return { correct, incorrect, unattempted };
  })();

  const scrollReviewQuestionTop = () => {
    if (reviewQuestionBodyRef.current) reviewQuestionBodyRef.current.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="exam-shell">
      <div className="exam-top-dark">
        <div className="exam-link">CAT 2026 MOCK TEST</div>
        <div className="exam-top-right">Review Answers</div>
      </div>
      <div className="exam-layout">
        <main className="exam-main">
          <div className="section-tabs-row">
            <div className="section-tabs">
              {activeSections.map((section, idx) => (
                <button
                  key={section.id}
                  className={`section-tab ${idx === reviewSectionIdx ? "active" : ""}`}
                  type="button"
                  onClick={() => setReviewSectionIdx(idx)}
                >
                  {section.id}
                </button>
              ))}
            </div>
          </div>
          <div className="section-strip">
            <div className="section-label">Sections</div>
            <div className="section-name">{currentSection.subsection}</div>
            <div className="time-left">Review Mode</div>
          </div>
          <div className="marks-strip">
            Correct <strong>{sectionCounts.correct}</strong> | Incorrect <strong>{sectionCounts.incorrect}</strong> | Unattempted <strong>{sectionCounts.unattempted}</strong>
          </div>
          <div className={`question-pane ${isTwoPaneLayout ? "" : "single-pane"}`}>
            <WatermarkLayer name={candidateName} />
            {isTwoPaneLayout && (
              <div className="passage-pane">
                {selectedContextText
                  ? (selectedQuestion?.isRC ? ensureRcParagraphs(toParagraphs(selectedContextText)) : toParagraphs(selectedContextText)).map((para, idx) => (
                    <div key={`${selectedQKey}-ctx-${idx}`} className="rich-para">
                      {renderInlineMedia(para, `${selectedQKey}-ctx-${idx}`)}
                    </div>
                  ))
                  : <div className="review-no-context">No shared passage/set for this question.</div>}
              </div>
            )}
            <div ref={reviewQuestionBodyRef} className={`question-body ${isTwoPaneLayout ? "" : "full-width"}`}>
              <h3>Question No. {activeQuestionIdx + 1}</h3>
              <div className="review-q-head">
                <span className={`review-status ${selectedStatus}`}>
                  {selectedStatus === "correct" ? "Correct" : selectedStatus === "incorrect" ? "Incorrect" : "Unattempted"}
                </span>
              </div>
              {formatQuestionParagraphs(selectedQuestion.question).map((para, pIdx) => (
                <div key={`${selectedQKey}-qp-${pIdx}`} className="rich-para">
                  {renderInlineMedia(para, `${selectedQKey}-qp-${pIdx}`)}
                </div>
              ))}
              {selectedQuestion.options?.length ? (
                <div className="options-list">
                  {selectedQuestion.options.map((opt, optIdx) => (
                    <div key={`${selectedQKey}-opt-${optIdx}`} className="option-row">
                      <span>{optIdx + 1}.</span>
                      <span>{renderInlineMedia(opt, `${selectedQKey}-opt-${optIdx}`)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="review-answers">
                <div><strong>Your Answer:</strong> {displayAnswer(selectedQuestion, selectedUserAnswer)}</div>
              </div>
              <div className="review-solution-wrap">
                <button type="button" className="review-solution-btn" onClick={() => toggleCorrectAnswer(selectedQKey)}>
                  {openCorrectAnswers[selectedQKey] ? "Hide Correct Ans" : "Show Correct Ans"}
                </button>
                {openCorrectAnswers[selectedQKey] ? (
                  <div className="review-solution-box">
                    <div className="rich-para"><strong>Correct Answer:</strong> {displayAnswer(selectedQuestion, selectedCorrectAnswer)}</div>
                  </div>
                ) : null}
              </div>
              {selectedSolutionText ? (
                <div className="review-solution-wrap">
                  <button type="button" className="review-solution-btn" onClick={() => toggleSolution(selectedQKey)}>
                    {openSolutions[selectedQKey] ? "Hide Solution" : "Show Solution"}
                  </button>
                  {openSolutions[selectedQKey] ? (
                    <div className="review-solution-box">
                      {formatQuestionParagraphs(selectedSolutionText).map((para, sIdx) => (
                        <div key={`${selectedQKey}-sol-${sIdx}`} className="rich-para">
                          {renderInlineMedia(para, `${selectedQKey}-sol-${sIdx}`)}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <button type="button" className="scroll-top-btn question-scroll-top" onClick={scrollReviewQuestionTop} title="Scroll to top">
                {"\u2191"}
              </button>
            </div>
          </div>
        </main>
        <aside className="exam-sidebar">
          <div className="profile-row">
            <div className="avatar-box"><img src={candidateImage || AVATAR_IMAGE} alt={candidateName} /></div>
            <div className="candidate-name">{candidateName}</div>
          </div>
          <div className="legend-card">
            <div className="legend-item"><span className="legend-chip answered">{sectionCounts.correct}</span><span>Correct</span></div>
            <div className="legend-item"><span className="legend-chip not-answered">{sectionCounts.incorrect}</span><span>Incorrect</span></div>
            <div className="legend-item"><span className="legend-chip not-visited">{sectionCounts.unattempted}</span><span>Unattempted</span></div>
          </div>
          <div className="palette-title">{currentSection.subsection}</div>
          <div className="palette-card">
            <div className="choose-label">Choose a Question</div>
            <div className="palette-grid">
              {currentSectionQuestions.map((question, idx) => (
                <button
                  key={`${currentSection.id}-nav-${question.id}`}
                  type="button"
                  className={`q-cell ${paletteStatusClass(idx)} ${activeQuestionIdx === idx ? "current" : ""}`}
                  onClick={() => jumpToQuestion(idx)}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
          <div className="sidebar-submit-wrap">
            <button className="sidebar-submit-btn back-score-btn" type="button" onClick={onBackToScore}>Back to Scorecard</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
export default App;
