#!/usr/bin/env node

/**
 * Copilot 初始化脚本
 * 在 .claude/ 目录中加载项目级别的 Copilot 配置
 * 用途：设置语言、工作区、行为等
 */

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const copilotConfigPath = path.join(projectRoot, '.copilot.json');

try {
  if (fs.existsSync(copilotConfigPath)) {
    const config = JSON.parse(fs.readFileSync(copilotConfigPath, 'utf-8'));
    
    console.log('✓ Copilot 配置已加载');
    console.log(`  项目: ${config.project.name}`);
    console.log(`  语言: ${config.language}`);
    console.log(`  回复语言: ${config.instructions.responses}`);
    
    // 设置环境变量供其他脚本使用
    process.env.COPILOT_LANGUAGE = config.language;
    process.env.COPILOT_RESPONSE_LANGUAGE = config.instructions.responses;
    
    // 验证必要的目录结构
    const requiredDirs = [
      config.workspace.claude_config,
      config.workspace.planning_root,
      config.workspace.cases_root
    ];
    
    console.log('\n✓ 工作区验证:');
    for (const dir of requiredDirs) {
      const fullPath = path.join(projectRoot, dir);
      const exists = fs.existsSync(fullPath);
      const status = exists ? '✓' : '✗';
      console.log(`  ${status} ${dir}`);
    }
    
  } else {
    console.log('⚠ 未找到 .copilot.json 配置文件');
    process.exit(1);
  }
} catch (error) {
  console.error('✗ 初始化失败:', error.message);
  process.exit(1);
}
