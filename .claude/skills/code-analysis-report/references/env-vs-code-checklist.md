# 环境问题 vs 代码问题判断清单

在开始深度代码分析之前，先用本清单快速过滤。

---

## 判断流程

```
收到报错
    ↓
扫描「环境问题特征」清单
    ↓
命中 ≥1 条？
    ├── 是 → 判定为「疑似环境问题」→ 走「环境问题处理流程」
    └── 否 → 扫描「代码问题特征」清单 → 判定为「代码问题」→ 走 Bug 分析流程
                                           ↓
                                      两者特征都有？
                                           ├── 是 → 报告中列出两种可能，各给验证方法
                                           └── 否 → 继续 Bug 分析
```

---

## 一、环境问题特征清单

### 1.1 数据库 / 中间件连接类

| 错误特征 | 对应环境问题 | 建议排查步骤 |
|---------|------------|------------|
| `Connection refused` | DB/Redis/MQ 服务未启动 | `telnet {host} {port}` 确认端口是否可达 |
| `Connection timed out` | 网络不通 / 防火墙拦截 | 检查网络策略、安全组规则 |
| `Unable to acquire JDBC Connection` | 连接池耗尽 | 查看连接池配置 `spring.datasource.hikari.maximum-pool-size`，检查是否有连接泄漏 |
| `Too many connections` | DB 连接数达到上限 | 排查连接泄漏，临时可重启应用释放连接 |
| `Communications link failure` | MySQL 连接中断（常见于长连接超时） | 检查 `wait_timeout` 配置，增加连接保活设置 |
| `Redis command timed out` | Redis 响应慢或不可用 | 检查 Redis 服务状态和网络延迟 |

### 1.2 配置 / 环境变量类

| 错误特征 | 对应环境问题 | 建议排查步骤 |
|---------|------------|------------|
| `Could not resolve placeholder '${xxx}'` | 环境变量或配置项未注入 | 检查 `.env` 文件、Nacos/Apollo 配置中心、K8s ConfigMap |
| `FileNotFoundException` (配置文件路径) | 配置文件缺失或路径错误 | 检查部署目录下是否存在对应配置文件 |
| `IllegalArgumentException: Could not find class` | 依赖 jar 包缺失 | 检查 Maven/Gradle 依赖，重新构建 |
| `ClassNotFoundException` / `NoClassDefFoundError` | classpath 配置错误或 jar 冲突 | 检查依赖版本冲突，`mvn dependency:tree` 排查 |

### 1.3 证书 / 安全类

| 错误特征 | 对应环境问题 | 建议排查步骤 |
|---------|------------|------------|
| `SSL handshake failed` | SSL 证书配置错误 | 检查证书是否过期、证书链是否完整 |
| `PKIX path building failed` | 证书不受信任（自签名证书） | 将证书导入 JVM truststore |
| `certificate has expired` | 证书已过期 | 联系运维更新证书 |

### 1.4 资源 / 性能类

| 错误特征 | 对应环境问题 | 建议排查步骤 |
|---------|------------|------------|
| `OutOfMemoryError: Java heap space`（偶发/规律性） | JVM 堆内存配置不足 | 检查 `-Xmx` 参数，分析堆转储（heap dump） |
| `OutOfMemoryError: Metaspace` | 元空间不足（通常是类加载过多） | 检查 `-XX:MaxMetaspaceSize` 配置 |
| `Address already in use: 8080` | 端口被占用 | `lsof -i :8080` 找出占用进程，kill 或更换端口 |
| `No space left on device` | 磁盘空间不足 | `df -h` 查看磁盘使用，清理日志/临时文件 |

### 1.5 权限 / 网络类

| 错误特征 | 对应环境问题 | 建议排查步骤 |
|---------|------------|------------|
| `Permission denied` (文件操作) | 文件系统权限不足 | `ls -la` 检查目标文件权限，`chmod`/`chown` 修正 |
| `Access denied for user 'xxx'@'xxx' to database` | 数据库用户权限不足 | 检查 DB 用户授权，`GRANT` 对应权限 |
| `403 Forbidden`（调用第三方接口） | API Key 失效或 IP 白名单未配置 | 检查 API Key 有效性和调用方 IP 是否在白名单 |

---

## 二、代码问题特征清单

命中以下特征，通常是代码缺陷，需要深入代码分析：

| 错误特征 | 常见代码问题 |
|---------|------------|
| `NullPointerException` | 空值未判断，链式调用中间环节为 null |
| `IndexOutOfBoundsException` | 数组/列表访问越界，未校验长度 |
| `ClassCastException` | 类型强转不安全，未判断 `instanceof` |
| `StackOverflowError` | 递归调用没有退出条件 |
| `NumberFormatException` | 字符串转数字未做格式校验 |
| `IllegalArgumentException`（业务层抛出） | 参数校验逻辑有误或未校验 |
| `DataIntegrityViolationException` | 违反数据库约束（唯一键、非空、外键），业务逻辑未预防 |
| `LazyInitializationException` | Hibernate 懒加载在 Session 关闭后访问 |
| `ConcurrentModificationException` | 遍历集合时对集合进行了修改 |
| `TransactionRequiredException` | 在非事务方法中执行了写操作 |
| `HttpMessageNotReadableException` | 请求体反序列化失败，字段类型不匹配 |
| `MethodArgumentNotValidException` | 参数校验注解触发，请求参数不合法（这是正常的校验，非 Bug） |

---

## 三、模糊情况处理（两者都有特征）

当报错同时具备环境和代码特征时，在报告中按以下格式说明：

```markdown
## 问题类型研判

本次报错存在两种可能：

**可能性1（较高）：环境配置问题**
- 依据：{具体的环境问题特征}
- 验证方法：{如何确认是环境问题，给出具体命令}

**可能性2：代码缺陷**
- 依据：{具体的代码问题特征}
- 验证方法：{如何确认是代码问题，如：在本地正常环境下能否复现}

**建议排查顺序：先排查环境问题（成本低），确认环境正常后再排查代码。**
```

---

## 四、常见「伪代码问题」场景（本质是环境/数据问题）

这些场景表面上像代码 Bug，实际是环境或数据导致的：

1. **接口偶发 500，重试后成功** → 通常是连接池/超时问题，非代码 Bug
2. **只在特定环境（如 test）报错，dev 正常** → 通常是配置差异，非代码 Bug
3. **昨天还好，今天突然报错（代码没改）** → 证书过期、配置被改、数据异常，非代码 Bug
4. **堆栈中全是框架代码，没有业务代码** → 通常是框架配置问题，如 Spring 容器初始化失败
5. **`DataIntegrityViolationException` unique constraint violated** → 可能是测试数据脏数据，建议先清理数据再复现

---

## 五、前端报错判断规则

适用于模式 C（前端报错分析）的环境问题 vs 代码问题判断。

| 现象 | 环境问题 | 代码问题 |
|------|---------|---------|
| `Cannot find module` | Node 版本或依赖未安装（`npm install` 未执行） | import 路径错误或模块名拼写错误 |
| `Hydration failed` | SSR/CSR 环境不一致（服务端与客户端渲染结果不同） | 组件中使用了 browser-only API（如 `window`、`document`） |
| `TypeError: X is not a function` | 依赖版本不兼容（API 已废弃或签名变更） | API 调用方式错误（如误用对象而非函数） |
| 仅特定浏览器报错 | 浏览器兼容性（CSS 特性、ES 语法支持差异） | 使用了非标准 API（需 polyfill 或换写法） |
| 构建成功但运行报错 | 环境变量缺失（`REACT_APP_*` / `VITE_*` 等未注入） | 运行时类型错误（数据结构与预期不符） |
| `[Vue warn]: Missing required prop` | — | 父组件调用时未传必填 prop |
| `React: Each child in a list should have a unique "key"` | — | 列表渲染缺少 `key` 属性 |
| `Maximum update depth exceeded` | — | 组件 useEffect/watch 产生循环更新 |