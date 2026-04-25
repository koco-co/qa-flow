# dtstack-cli

DTStack 平台前置条件 CLI + SDK。覆盖 SQL 执行（平台 API / 直连 DB）、离线项目幂等创建、资产元数据同步。

## 安装

已通过根 workspace 链接，无需单独安装。在测试代码里：

```ts
import { precondSetup } from "dtstack-cli";
```

## 配置

默认从 `workspace/{project}/.dtstack-cli.yaml` 读取，可被 `$DTSTACK_CONFIG` 或 `--config` 覆盖。

```yaml
defaultEnv: ci78
environments:
  ci78:
    baseUrl: http://shuzhan63-test-ltqc.k8s.dtstack.cn
    login:
      username: admin@dtstack.com
      password: ${DTSTACK_PASSWORD}
datasources:
  doris-ci78:
    type: doris
    host: 172.16.x.x
    port: 9030
    username: root
    password: ${DORIS_PASSWORD}
```

## 命令

详见 [`docs/usage.md`](docs/usage.md)（与 `--help` 输出同源）。

## 测试

```bash
bun test tools/dtstack-cli/__tests__
```
