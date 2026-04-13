export interface TestStep {
  step: string;
  expected: string;
}

export interface TestCase {
  title: string;
  priority: string;
  preconditions?: string;
  steps: TestStep[];
}

export interface SubGroup {
  name: string;
  test_cases: TestCase[];
}

export interface Page {
  name: string;
  sub_groups?: SubGroup[];
  test_cases?: TestCase[];
}

export interface Module {
  name: string;
  pages: Page[];
}

export interface Meta {
  project_name: string;
  requirement_name: string;
  version?: string;
  module_key?: string;
  requirement_id?: number;
  requirement_ticket?: string;
  description?: string;
}

export interface IntermediateJson {
  meta: Meta;
  modules: Module[];
}
