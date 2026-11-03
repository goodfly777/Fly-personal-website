import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('src/components/Layout.tsx'), 'utf8');

assert.doesNotMatch(
  source,
  /getActiveResumeVersion|resumeApi|downloadDialog|下载简历|简历|onDownload/,
  'Shared desktop and mobile navigation should no longer expose resume downloads.',
);
const admin = readFileSync(resolve('src/pages/Admin.tsx'), 'utf8');
assert.doesNotMatch(admin, /listAdminResumeVersions|handleResumeUpload|about-resume-versions|resumeVersions|resumeActionId/);
assert.match(admin, /updateAboutResumeEntry/, 'Project and publication content must remain editable.');
assert.match(admin, /<ProfileDetailsEditor/, 'Personal information must remain editable.');
