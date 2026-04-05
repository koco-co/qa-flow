#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const tmpDir = path.join(__dirname);
const files = ['module_quality.json', 'module_asset.json', 'module_security.json', 'module_standard.json'];

const merged = {
  meta: {
    project_name: "数据资产平台",
    requirement_name: "202603-数据资产v6.4.9",
    version: "v6.4.9",
    description: "数据质量、数据资产、数据安全、数据标准模块功能验证",
    source_file: "XmindCase/DataAssets/202603-数据资产v6.4.9.xmind",
    standardized: true
  },
  modules: []
};

// Strip non-standard fields (e.g. "id") from test cases and steps
function cleanCase(tc) {
  const cleaned = {
    title: tc.title,
    priority: tc.priority,
  };
  if (tc.preconditions) cleaned.preconditions = tc.preconditions;
  cleaned.steps = (tc.steps || []).map(s => ({ step: s.step, expected: s.expected }));
  return cleaned;
}

function cleanSubGroups(subGroups) {
  return subGroups.map(sg => ({
    name: sg.name,
    test_cases: sg.test_cases.map(cleanCase)
  }));
}

function cleanPages(pages) {
  return pages.map(p => {
    const page = { name: p.name };
    if (p.sub_groups && p.sub_groups.length > 0) {
      page.sub_groups = cleanSubGroups(p.sub_groups);
    }
    if (p.test_cases && p.test_cases.length > 0) {
      page.test_cases = p.test_cases.map(cleanCase);
    }
    return page;
  });
}

let totalCases = 0;

for (const file of files) {
  const filePath = path.join(tmpDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  for (const mod of data.modules) {
    const cleanedMod = {
      name: mod.name,
      pages: cleanPages(mod.pages)
    };
    merged.modules.push(cleanedMod);

    // Count test cases
    for (const page of cleanedMod.pages) {
      if (page.sub_groups) {
        for (const sg of page.sub_groups) {
          totalCases += sg.test_cases.length;
        }
      }
      if (page.test_cases) {
        totalCases += page.test_cases.length;
      }
    }
  }
}

const outputPath = path.join(tmpDir, 'merged.json');
fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2), 'utf8');
console.log(`合并完成：${merged.modules.length} 个模块，共 ${totalCases} 条用例`);
console.log(`输出：${outputPath}`);
