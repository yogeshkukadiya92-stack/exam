export type PracticalWordQuestionType = "single" | "multiple";

export interface ParsedPracticalWordQuestion {
  question_text: string;
  options: string[];
  correct: number[];
  marks: number;
  negative_marks: number;
  type: PracticalWordQuestionType;
  explanation: string | null;
  sort_id: number | null;
}

export interface ParsedPracticalWordCase {
  title: string;
  content: string;
  position: number;
  questions: ParsedPracticalWordQuestion[];
}

export interface PracticalWordParseResult {
  cases: ParsedPracticalWordCase[];
  totalQuestions: number;
  skippedQuestions: number;
  warnings: string[];
}

interface DraftCase {
  title: string;
  baseTitle: string;
  contentLines: string[];
  position: number;
  questions: ParsedPracticalWordQuestion[];
}

interface DraftQuestion {
  questionTextParts: string[];
  optionSlots: string[];
  correctSlots: number[];
  marks: number;
  negativeMarks: number;
  type: PracticalWordQuestionType;
  explanationParts: string[];
  collectingExplanation: boolean;
  sortId: number | null;
}

function cleanLine(line: string) {
  return line
    .replace(/\u00a0/g, " ")
    .replace(/\t+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripPagePrefix(line: string) {
  return line.replace(/^\[P\.[^\]]+\]\s*/i, "").trim();
}

function isCaseStart(line: string) {
  return /\bDirection\s*\([^)]*\)\s*Case Study\b/i.test(stripPagePrefix(line));
}

function caseBaseTitle(line: string) {
  const withoutPrefix = stripPagePrefix(line);
  return withoutPrefix.match(/(Case Study\s+\d+\s*:\s*.+)$/i)?.[1]?.trim() || withoutPrefix;
}

function isQuestionStart(line: string) {
  return /^\[Q\]\s*/i.test(line);
}

function stripQuestionPrefix(line: string) {
  return line.replace(/^\[Q\]\s*/i, "").trim();
}

function optionMatch(line: string) {
  return line.match(/^\(([a-d])\)\s*(.+)$/i);
}

function tagMatch(line: string) {
  return line.match(/^\[(qtype|ans|marks|sortid|soln)\]\s*(.*)$/i);
}

function parseAnswerIndexes(value: string) {
  const seen = new Set<number>();
  for (const letter of value.toUpperCase().replace(/[^A-D]/g, "")) {
    seen.add(letter.charCodeAt(0) - 65);
  }
  return [...seen].sort((a, b) => a - b);
}

function parseMarks(value: string) {
  const numbers = value.match(/[-+]?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  return {
    marks: Number.isFinite(numbers[0]) && numbers[0] > 0 ? numbers[0] : 1,
    negativeMarks:
      Number.isFinite(numbers[1]) && numbers[1] !== 0 ? Math.abs(numbers[1]) : 0,
  };
}

function createDraftQuestion(questionText: string): DraftQuestion {
  return {
    questionTextParts: [questionText],
    optionSlots: [],
    correctSlots: [],
    marks: 1,
    negativeMarks: 0,
    type: "single",
    explanationParts: [],
    collectingExplanation: false,
    sortId: null,
  };
}

function finalizeQuestion(
  draft: DraftQuestion | null,
  warnings: string[],
  rowNumber: number
) {
  if (!draft) return null;

  const options = draft.optionSlots
    .map((text, originalIndex) => ({ text: text?.trim() ?? "", originalIndex }))
    .filter((option) => option.text);

  const compactCorrect = options
    .map((option, compactIndex) =>
      draft.correctSlots.includes(option.originalIndex) ? compactIndex : -1
    )
    .filter((index) => index >= 0);

  const questionText = draft.questionTextParts.join(" ").trim();

  if (!questionText || options.length < 2 || compactCorrect.length === 0) {
    warnings.push(`Question near line ${rowNumber} was skipped because it is incomplete.`);
    return null;
  }

  return {
    question_text: questionText,
    options: options.map((option) => option.text),
    correct: compactCorrect,
    marks: draft.marks,
    negative_marks: draft.negativeMarks,
    type: compactCorrect.length > 1 ? "multiple" : draft.type,
    explanation: draft.explanationParts.join("\n").trim() || null,
    sort_id: draft.sortId,
  } satisfies ParsedPracticalWordQuestion;
}

export function parsePracticalWordText(text: string): PracticalWordParseResult {
  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const cases: ParsedPracticalWordCase[] = [];
  const warnings: string[] = [];
  let skippedQuestions = 0;
  let totalQuestions = 0;
  let currentCase: DraftCase | null = null;
  let currentQuestion: DraftQuestion | null = null;

  const finishQuestion = (lineNumber: number) => {
    const question = finalizeQuestion(currentQuestion, warnings, lineNumber);
    if (question && currentCase) currentCase.questions.push(question);
    else if (currentQuestion) skippedQuestions++;
    currentQuestion = null;
  };

  const finishCase = () => {
    if (!currentCase) return;
    if (currentCase.questions.length > 0) {
      cases.push({
        title: currentCase.title,
        content: currentCase.contentLines.join("\n").trim(),
        position: currentCase.position,
        questions: currentCase.questions,
      });
    }
    currentCase = null;
  };

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    if (isCaseStart(line)) {
      finishQuestion(lineNumber);
      finishCase();

      const cleanedCaseLine = stripPagePrefix(line);
      const baseTitle = caseBaseTitle(line);
      currentCase = {
        title: baseTitle,
        baseTitle,
        contentLines: [cleanedCaseLine],
        position: cases.length + 1,
        questions: [],
      };
      return;
    }

    if (isQuestionStart(line)) {
      if (!currentCase) {
        currentCase = {
          title: "Imported Word Case Study",
          baseTitle: "Imported Word Case Study",
          contentLines: ["Imported from Word file"],
          position: cases.length + 1,
          questions: [],
        };
      }

      finishQuestion(lineNumber);
      currentQuestion = createDraftQuestion(stripQuestionPrefix(line));
      totalQuestions++;
      return;
    }

    if (currentQuestion) {
      const option = optionMatch(line);
      if (option) {
        currentQuestion.optionSlots[option[1].toUpperCase().charCodeAt(0) - 65] =
          option[2].trim();
        currentQuestion.collectingExplanation = false;
        return;
      }

      const tag = tagMatch(line);
      if (tag) {
        const key = tag[1].toLowerCase();
        const value = tag[2].trim();

        if (key === "qtype") {
          currentQuestion.type = /multi|multiple/i.test(value) ? "multiple" : "single";
        } else if (key === "ans") {
          currentQuestion.correctSlots = parseAnswerIndexes(value);
        } else if (key === "marks") {
          const marks = parseMarks(value);
          currentQuestion.marks = marks.marks;
          currentQuestion.negativeMarks = marks.negativeMarks;
        } else if (key === "sortid") {
          const sortId = Number(value);
          currentQuestion.sortId = Number.isFinite(sortId) ? sortId : null;
        } else if (key === "soln") {
          currentQuestion.collectingExplanation = true;
          if (value) currentQuestion.explanationParts.push(value);
        }
        return;
      }

      if (currentQuestion.collectingExplanation || currentQuestion.optionSlots.length > 0) {
        currentQuestion.explanationParts.push(line);
      } else {
        currentQuestion.questionTextParts.push(line);
      }
      return;
    }

    if (currentCase) {
      const cleaned = stripPagePrefix(line);
      if (/^LIFESTYLE\s+\d+\s*:/i.test(cleaned)) {
        currentCase.title = `${currentCase.baseTitle} - ${cleaned}`;
      }
      currentCase.contentLines.push(cleaned);
    }
  });

  finishQuestion(lines.length);
  finishCase();

  return {
    cases,
    totalQuestions,
    skippedQuestions,
    warnings,
  };
}
