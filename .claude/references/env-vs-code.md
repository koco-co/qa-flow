# 环境问题 vs 代码问题 判断清单

> 供 `bug-report` / `hotfix-case-gen` 等 skill 在分析 Bug 时参考，辅助判断问题根源所在。

<classification_contract>
<defaultable_unknown>上下文略有缺口，但仍可给出倾向性判断；需在报告中附带后续检查项。</defaultable_unknown>
<blocking_unknown>缺少完整堆栈、触发步骤或关键上下文，无法安全判断根因归属。</blocking_unknown>
<invalid_input>输入为空、日志被截断到无法识别、或内容与分析模式不匹配。</invalid_input>
</classification_contract>

建议输出结构化判断载荷：

```json
{
  "classification": "environment|code|mixed|unknown",
  "confidence": 0.78,
  "uncertainty": [
    {
      "severity": "blocking_unknown",
      "item": "缺少完整堆栈",
      "impact": "无法定位第一条业务代码栈帧"
    }
  ]
}
```

---

## 环境问题信号

出现以下任一信号，倾向于判断为**环境问题**：

### 网络 / 连接类

- 报错包含：`Connection refused`、`Connection timed out`、`Connection reset`
- 报错包含：`java.net.SocketTimeoutException`、`java.net.ConnectException`
- 请求超时（HTTP 504 / 408）
- DNS 解析失败：`UnknownHostException`

### 配置 / 资源类

- 报错包含：`FileNotFoundException`（配置文件路径）
- 报错包含：`ClassNotFoundException`（依赖缺失，非代码引用错误）
- 报错包含：`NoSuchBeanDefinitionException`（Spring Bean 未注册，通常是配置问题）
- 环境变量 / 配置项缺失：`Property xxx not found`、`Missing required configuration`
- 端口被占用：`Address already in use`

### 权限 / 认证类

- HTTP 响应码 401 Unauthorized（Token 失效 / 未配置）
- HTTP 响应码 403 Forbidden（RBAC 权限未配置）
- 报错包含：`Access denied for user`（数据库权限）
- 报错包含：`Permission denied`（文件系统权限）

### 资源不足类

- 报错包含：`OutOfMemoryError`（JVM 堆内存不足，需调整 -Xmx）
- 报错包含：`Too many open files`（文件描述符限制）
- 报错包含：`No space left on device`（磁盘满）
- 数据库连接池耗尽：`Unable to acquire JDBC Connection`、`Timeout waiting for connection from pool`

---

## 代码问题信号

出现以下任一信号，倾向于判断为**代码问题**：

### 空值 / 类型错误类

- 报错包含：`NullPointerException`（NPE）且堆栈根因在业务代码（非框架）
- 报错包含：`ClassCastException`（类型转换错误）
- 报错包含：`ArrayIndexOutOfBoundsException`、`IndexOutOfBoundsException`（下标越界）
- JS: `Cannot read properties of undefined`、`Cannot read property 'xxx' of null`

### 逻辑 / 计算错误类

- 数值计算异常：`ArithmeticException: / by zero`
- 返回数据与业务预期不符（数量、金额、状态计算错误）
- 条件判断遗漏（特定输入下走到了不应走的分支）

### SQL / 数据库类

- 报错包含：`SQLSyntaxErrorException`（SQL 语法错误，代码拼接问题）
- 报错包含：`DataIntegrityViolationException`（唯一键冲突、非空约束，业务数据校验缺失）
- 数据查询逻辑错误导致数据丢失或重复

### 并发类

- 报错包含：`ConcurrentModificationException`（遍历时修改集合）
- 报错包含：`DeadlockLoserDataAccessException`（数据库死锁，通常是事务设计问题）
- 共享状态在多线程下被并发修改

### 框架使用类

- 违反框架规范（如在 React Hooks 规则限制场景中调用 Hook）
- 错误使用 API（如调用了已废弃或签名变更的方法）
- 序列化 / 反序列化失败（字段映射错误）

---

## 混合问题

同时存在以下两种情况时，判断为**混合问题**：

1. 代码本身存在缺陷（如未做空值防护）
2. 但在特定环境下（如测试环境与生产环境配置差异）才会触发

混合问题需在报告中分别描述：

- 代码侧的修复建议
- 环境侧的配置检查项

## 不确定性落点

- **defaultable_unknown**：如缺少浏览器版本、JDK 小版本、非关键配置项，但主错误堆栈完整，可继续判断并附带建议补料。
- **blocking_unknown**：如仅有一句「报错了」、没有冲突块、没有 root cause 栈帧，必须先补料再判断。
- **invalid_input**：如提供的是无关日志、空文件、损坏链接、仅有截图且无文本可解析，应直接返回输入无效。

---

## 快速判断流程

```
报错是否直接来自 OS / JVM / 网络层？
├── 是 → 先排查环境问题
└── 否 → 堆栈根因是否在业务包名下（如 com.dtstack）？
         ├── 是 → 代码问题
         └── 否（在框架/第三方库中） → 继续向上追溯调用栈
                                         找到最近的业务代码帧再判断
```

若上述流程任一步骤因证据缺失无法继续，按以下优先级返回：

1. `invalid_input`：输入本身不可分析
2. `blocking_unknown`：输入可读但缺关键上下文
3. `defaultable_unknown`：可继续，但需标记假设与补充检查项
