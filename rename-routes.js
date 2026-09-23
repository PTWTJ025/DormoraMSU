const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all files from git grep
const files = execSync('git grep -l -E "(dorm-list|dorm-detail|dorm-compare|dorm-map|edit-dorm)" src/').toString().split('\n').filter(Boolean);

const replacements = [
  // 1. Exact string paths in app.routes.ts and routerLink attributes
  { from: /'dorm-list'/g, to: "'listings'" },
  { from: /"\/dorm-list"/g, to: '"/listings"' },
  { from: /'\/dorm-list'/g, to: "'/listings'" },
  { from: /`\/dorm-list`/g, to: "`/listings`" },

  { from: /'dorm-detail\/:id'/g, to: "'detail/:id'" },
  { from: /"\/dorm-detail\//g, to: '"/detail/' },
  { from: /'\/dorm-detail\//g, to: "'/detail/" },
  { from: /`\/dorm-detail\//g, to: "`/detail/" },
  { from: /'\/dorm-detail'/g, to: "'/detail'" },

  { from: /'dorm-compare'/g, to: "'compare'" },
  { from: /"\/dorm-compare"/g, to: '"/compare"' },
  { from: /'\/dorm-compare'/g, to: "'/compare'" },

  { from: /'dorm-map'/g, to: "'map'" },
  { from: /"\/dorm-map"/g, to: '"/map"' },
  { from: /'\/dorm-map'/g, to: "'/map'" },

  { from: /'admin\/edit-dorm\/:dormId'/g, to: "'admin/edit/:dormId'" },
  { from: /"\/admin\/edit-dorm\//g, to: '"/admin/edit/' },
  { from: /'\/admin\/edit-dorm\//g, to: "'/admin/edit/" },
  { from: /`\/admin\/edit-dorm\//g, to: "`/admin/edit/" }
];

let changedCount = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  for (const { from, to } of replacements) {
    content = content.replace(from, to);
  }

  // Also replace router.navigate array items if any
  // e.g. this.router.navigate(['/dorm-detail', id]) -> ['/detail', id]
  content = content.replace(/\['\/dorm-detail'/g, "['/detail'");
  content = content.replace(/\['\/dorm-compare'/g, "['/compare'");
  content = content.replace(/\['\/dorm-list'/g, "['/listings'");
  content = content.replace(/\['\/dorm-map'/g, "['/map'");
  content = content.replace(/\['\/admin\/edit-dorm'/g, "['/admin/edit'");

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
    changedCount++;
  }
}
console.log('Done. Files updated:', changedCount);

