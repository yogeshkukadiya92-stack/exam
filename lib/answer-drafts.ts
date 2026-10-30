export interface AnswerDraft {
  question_id: string;
  selected_option_ids: string[];
  text_answer: string | null;
  marked_for_review: boolean;
}

/** Only unsynchronised answers are kept; acknowledged server data wins on reload. */
export class AnswerDraftStore {
  private drafts: Record<string, AnswerDraft> = {};
  private readonly key: string;

  constructor(private storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, attemptId: string) {
    this.key = `exam-answer-drafts:${attemptId}`;
    const raw = storage.getItem(this.key);
    if (!raw) return;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
      for (const [id, value] of Object.entries(parsed)) {
        const draft = value as Partial<AnswerDraft> | null;
        if (draft && draft.question_id === id && Array.isArray(draft.selected_option_ids)
          && draft.selected_option_ids.every((option) => typeof option === 'string')
          && (draft.text_answer === null || typeof draft.text_answer === 'string')
          && typeof draft.marked_for_review === 'boolean') {
          this.drafts[id] = draft as AnswerDraft;
        }
      }
    } catch {
      // A corrupt backup must not prevent loading answers from the server.
    }
  }

  entries() { return Object.values(this.drafts); }

  put(draft: AnswerDraft) {
    this.drafts[draft.question_id] = draft;
    this.persist();
  }

  acknowledge(draft: AnswerDraft) {
    // A slow response for an older selection cannot erase a newer local answer.
    if (this.drafts[draft.question_id] !== draft) return;
    delete this.drafts[draft.question_id];
    this.persist();
  }

  private persist() {
    if (Object.keys(this.drafts).length) this.storage.setItem(this.key, JSON.stringify(this.drafts));
    else this.storage.removeItem(this.key);
  }
}
