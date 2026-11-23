import Dexie, { type Table } from 'dexie';
import type { ReviewRecord } from '../domain/resultReview';
import type { RuleDraft } from '../domain/ruleEditor';
import type { FieldDraft } from '../domain/fieldReview';
import type { WikiDraft } from '../domain/wikiReview';

/** Admin review decisions stay on this device; reviewers exchange them as files until accounts exist. */
export class AdminDatabase extends Dexie {
  reviews!: Table<ReviewRecord, string>;
  rules!: Table<RuleDraft, string>;
  fields!: Table<FieldDraft, string>;
  wiki!: Table<WikiDraft, string>;
  constructor(name = 'jinhak-navi-admin-v1') {
    super(name);
    this.version(1).stores({ reviews: 'key, updated_at' });
    this.version(2).stores({ reviews: 'key, updated_at', rules: 'id, updated_at' });
    this.version(3).stores({ reviews: 'key, updated_at', rules: 'id, updated_at', fields: 'key' });
    this.version(4).stores({ reviews: 'key, updated_at', rules: 'id, updated_at', fields: 'key', wiki: 'key, university' });
  }
}
export const adminDb = new AdminDatabase();
