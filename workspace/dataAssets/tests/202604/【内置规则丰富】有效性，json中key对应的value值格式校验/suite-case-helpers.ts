import { test } from "../../fixtures/step-screenshot";
import {
  ACTIVE_DATASOURCES,
  SUITE_NAME,
  clearCurrentDatasource,
  setCurrentDatasource,
  type DatasourceConfig,
} from "./test-data";

export function describeByDatasource(
  pageName: string,
  defineCases: (datasource: DatasourceConfig) => void,
): void {
  for (const datasource of ACTIVE_DATASOURCES) {
    test.describe(`${SUITE_NAME} - ${pageName} - ${datasource.reportName}`, () => {
      test.beforeAll(() => {
        setCurrentDatasource(datasource);
      });

      test.beforeEach(() => {
        setCurrentDatasource(datasource);
      });

      test.afterAll(() => {
        clearCurrentDatasource();
      });

      defineCases(datasource);
    });
  }
}
