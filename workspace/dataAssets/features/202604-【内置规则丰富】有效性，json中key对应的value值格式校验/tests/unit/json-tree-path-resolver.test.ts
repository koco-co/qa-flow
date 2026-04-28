import { describe, expect, test } from "bun:test";
import {
  resolveJsonTreePathByKeyPath,
  type JsonTreeNode,
} from "./json-tree-path-resolver";

describe("resolveJsonTreePathByKeyPath", () => {
  test("prefers the exact nested fullPath over flat duplicate keys", () => {
    const tree: JsonTreeNode[] = [
      {
        id: "wrong-parent",
        jsonKey: "existKey_1776737934428",
        children: [
          {
            id: "wrong-person-name",
            jsonKey: "person-name",
            value: "2222",
            fullPath: "['existKey_1776737934428']['person-name']",
            fullPathPoint: "existKey_1776737934428.person-name",
          },
        ],
      },
      {
        id: "person",
        jsonKey: "person",
        children: [
          {
            id: "right-person-name",
            jsonKey: "name",
            name: "person-name",
            value: "^[\\u4e00-\\u9fa5]+$",
            fullPath: "['person']['name']",
            fullPathPoint: "person.name",
          },
          {
            id: "right-person-age",
            jsonKey: "age",
            name: "person-age",
            value: "^\\d{1,3}$",
            fullPath: "['person']['age']",
            fullPathPoint: "person.age",
          },
        ],
      },
      {
        id: "wrong-person-age",
        jsonKey: "person-age",
        name: "人员年龄",
        value: "^\\d{1,3}$",
        fullPath: "['person-age']",
        fullPathPoint: "person-age",
      },
    ];

    const personNamePath = resolveJsonTreePathByKeyPath(tree, "person-name");
    const personAgePath = resolveJsonTreePathByKeyPath(tree, "person-age");

    expect(personNamePath?.pathNodes.at(-1)?.id).toBe("right-person-name");
    expect(personAgePath?.pathNodes.at(-1)?.id).toBe("right-person-age");
  });

  test("falls back to a flat key when no nested path exists", () => {
    const tree: JsonTreeNode[] = [
      {
        id: "flat-key",
        jsonKey: "test-key-001",
        name: "test-key-001",
        value: "^.+$",
        fullPath: "['test-key-001']",
        fullPathPoint: "test-key-001",
      },
    ];

    const resolvedPath = resolveJsonTreePathByKeyPath(tree, "test-key-001");

    expect(resolvedPath?.pathNodes.at(-1)?.id).toBe("flat-key");
    expect(resolvedPath?.pathSegments).toEqual(["test-key-001"]);
  });
});
