export interface ProgressAnswer {
  question_id: string;
  selected_option_ids: string[] | null;
  text_answer: string | null;
  marked_for_review: boolean | null;
}

export function hasAnswer(answer: ProgressAnswer) {
  return !!(answer.selected_option_ids?.length || answer.text_answer?.trim());
}

export function examProgress(questionIds: string[], answers: ProgressAnswer[]) {
  const byQuestion = new Map(answers.map((answer) => [answer.question_id, answer]));
  let answered = 0;
  let review = 0;
  for (const id of questionIds) {
    const answer = byQuestion.get(id);
    if (!answer) continue;
    if (hasAnswer(answer)) answered++;
    if (answer.marked_for_review) review++;
  }
  // Review is independent: an answered question can also be marked for review.
  return { answered, review, skipped: questionIds.length - answered, total: questionIds.length };
}
