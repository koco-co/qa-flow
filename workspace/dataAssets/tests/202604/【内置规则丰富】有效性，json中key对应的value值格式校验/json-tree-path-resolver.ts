export type JsonTreeNode = {
  id: number | string;
  jsonKey: string;
  fullPath?: string;
  fullPathPoint?: string;
  level?: number;
  name?: string;
  value?: string;
  dataSourceType?: number;
  children?: JsonTreeNode[];
};

export type ResolvedJsonTreePath = {
  pathSegments: string[];
  pathNodes: JsonTreeNode[];
};

export function buildFullPath(pathSegments: readonly string[]): string {
  return pathSegments.map((segment) => `['${segment}']`).join("");
}

export function buildKeyPath(pathSegments: readonly string[]): string {
  return pathSegments.join("-");
}

export function buildFallbackResolvedPath(
  keyPath: string,
): ResolvedJsonTreePath {
  const pathSegments = keyPath.split("-");
  return {
    pathSegments,
    pathNodes: pathSegments.map((segment) => ({
      id: segment,
      jsonKey: segment,
    })),
  };
}

function flattenResolvedJsonTreePaths(
  nodes: readonly JsonTreeNode[],
  currentSegments: readonly string[] = [],
  currentNodes: readonly JsonTreeNode[] = [],
): ResolvedJsonTreePath[] {
  return nodes.flatMap((node) => {
    const nextSegments = [...currentSegments, node.jsonKey];
    const nextNodes = [...currentNodes, node];
    return [
      {
        pathSegments: nextSegments,
        pathNodes: nextNodes,
      },
      ...flattenResolvedJsonTreePaths(
        node.children ?? [],
        nextSegments,
        nextNodes,
      ),
    ];
  });
}

function scoreResolvedJsonTreePath(
  candidate: ResolvedJsonTreePath,
  keyPath: string,
): number {
  const leafNode = candidate.pathNodes.at(-1);
  if (!leafNode) {
    return Number.NEGATIVE_INFINITY;
  }

  const keyPathSegments = keyPath.split("-");
  const actualKeyPath = buildKeyPath(candidate.pathSegments);
  const expectedFullPath = buildFullPath(keyPathSegments);
  const expectedFullPathPoint = keyPathSegments.join(".");

  let score = 0;

  if (leafNode.fullPath === expectedFullPath) {
    score += 1000;
  }
  if (leafNode.fullPathPoint === expectedFullPathPoint) {
    score += 900;
  }
  if (leafNode.name === keyPath) {
    score += 800;
  }
  if (actualKeyPath === keyPath) {
    score += 700;
  }
  if (leafNode.jsonKey === keyPath) {
    score += 600;
  }
  if (candidate.pathSegments.length === keyPathSegments.length) {
    score += 200;
  }
  if (candidate.pathSegments.at(-1) === keyPathSegments.at(-1)) {
    score += 100;
  }
  if (candidate.pathSegments.length === 1 && keyPathSegments.length > 1) {
    score -= 300;
  }

  return score;
}

export function resolveJsonTreePathByKeyPath(
  tree: readonly JsonTreeNode[],
  keyPath: string,
): ResolvedJsonTreePath | null {
  const keyPathSegments = keyPath.split("-");
  const expectedFullPath = buildFullPath(keyPathSegments);
  const expectedFullPathPoint = keyPathSegments.join(".");

  const candidates = flattenResolvedJsonTreePaths(tree).filter((candidate) => {
    const leafNode = candidate.pathNodes.at(-1);
    if (!leafNode) {
      return false;
    }

    return (
      buildKeyPath(candidate.pathSegments) === keyPath ||
      leafNode.name === keyPath ||
      leafNode.jsonKey === keyPath ||
      leafNode.fullPath === expectedFullPath ||
      leafNode.fullPathPoint === expectedFullPathPoint
    );
  });

  if (candidates.length === 0) {
    return null;
  }

  return candidates.sort(
    (left, right) =>
      scoreResolvedJsonTreePath(right, keyPath) -
      scoreResolvedJsonTreePath(left, keyPath),
  )[0];
}
