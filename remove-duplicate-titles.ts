import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const docsDir = 'docs';

const chapters = [
  '01-agent-basics',
  '02-agent-core',
  '03-tool-system',
  '04-session-management',
  '05-provider-system',
  '06-mcp-integration',
  '07-tui-interface',
  '08-http-api-server',
  '09-data-persistence',
  '10-multi-platform-ui',
  '11-code-intelligence',
  '12-plugins-extensions',
  '13-deployment-infrastructure',
  '14-testing-quality',
  '15-advanced-topics',
];

for (const chapter of chapters) {
  const filePath = join(docsDir, chapter, 'index.md');
  let content = readFileSync(filePath, 'utf-8');

  // 删除第一个 H1 标题（紧跟在 frontmatter 后面的）
  content = content.replace(/^---\n[\s\S]*?\n---\n\n# [^\n]+\n/, (match) => {
    return match.replace(/\n# [^\n]+\n/, '\n');
  });

  writeFileSync(filePath, content, 'utf-8');
  console.log(`✓ ${chapter}`);
}

console.log('\n完成！');
