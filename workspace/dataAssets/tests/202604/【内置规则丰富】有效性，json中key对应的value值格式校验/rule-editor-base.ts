import "./test-data";

const mod = await import("../有效性-取值范围枚举范围规则/rule-editor-helpers");

export const addRuleToPackage = mod.addRuleToPackage;
export const createRuleSetDraft = mod.createRuleSetDraft;
export const deleteRuleSetsByTableNames = mod.deleteRuleSetsByTableNames;
export const getRulePackage = mod.getRulePackage;
export const getRuleSetListRow = mod.getRuleSetListRow;
export const getSelectOptions = mod.getSelectOptions;
export const gotoRuleBase = mod.gotoRuleBase;
export const gotoRuleSetList = mod.gotoRuleSetList;
export const keepOnlyRulePackages = mod.keepOnlyRulePackages;
export const openRuleSetEditor = mod.openRuleSetEditor;
export const saveRuleSet = mod.saveRuleSet;
export const selectRuleFieldAndFunction = mod.selectRuleFieldAndFunction;
