/**
 * Profile answers the signup wizard collects — spelled exactly the way the
 * settings app spells them.
 *
 * `apps/myprofile` owns the settings screens, and its "Personal details → Work"
 * sheet is the same four questions this wizard asks. The two apps share no
 * package (neither `apps/accounts/package.json` nor `apps/myprofile/package.json`
 * depends on anything in `packages/`), so these lists are mirrored by hand and
 * kept BYTE-IDENTICAL to:
 *
 *   - labels/placeholders/keys → `JOB_FIELDS` in
 *     `apps/myprofile/app/settings/personal-details/page.tsx`
 *   - gender options → `GENDERS` in
 *     `apps/myprofile/app/settings/edit-profile/page.tsx`
 *   - wire names → `PROFILE_FIELDS` in `apps/myprofile/api/contract.ts`, which
 *     is also the shape `POST /api/auth/signup` accepts and the
 *     `/api/profile` + `/api/internal/profile` endpoints write.
 *
 * A person who answers the wizard must see the identical boxes already filled
 * when they open the settings app afterwards, and an edit made there must be
 * what any accounts-app screen reads back. Changing one list means changing the
 * other in the same commit.
 */

/** Local form key → the key the brain stores it under. */
export type WorkKey = 'jobRole' | 'jobCompany' | 'jobPlace' | 'jobStartedOn';

export const WORK_FIELDS: Record<WorkKey, { label: string; placeholder: string; wire: string; maxLength: number }> = {
  jobRole: { label: 'Job title', placeholder: 'Product engineer', wire: 'companyRole', maxLength: 120 },
  jobCompany: { label: 'Company', placeholder: 'Tirbeo', wire: 'companyName', maxLength: 120 },
  jobPlace: { label: 'Work location', placeholder: 'Kathmandu, Nepal', wire: 'jobPlace', maxLength: 120 },
  jobStartedOn: { label: 'Started in', placeholder: '2022', wire: 'jobStarted', maxLength: 10 },
};

export const WORK_KEYS = Object.keys(WORK_FIELDS) as WorkKey[];

/** Meta by form-field name, for callers whose key is still a plain string. */
export function workFieldMeta(field: string): { label: string; placeholder: string; wire: string; maxLength: number } {
  return WORK_FIELDS[field as WorkKey];
}

/** What the settings app's Gender picker offers, in the same order. The value
 *  stored is the label itself, so a signup answer matches what the picker
 *  compares against instead of showing up as an unselected `male`. */
export const GENDERS = ['Female', 'Male', 'Non-binary', 'Prefer not to say'];
