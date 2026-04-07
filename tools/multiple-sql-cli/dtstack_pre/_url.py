"""URL 路由工具。"""
from urllib.parse import urlparse


def get_api_base(base_url: str) -> str:
    """
    返回 API 请求的基础 URL（只含 scheme://host[:port]，不含路径）。

    平台所有产品的 REST API 均直接挂载在服务根路径下，产品前缀（/batch、
    /dataAssets 等）只用于前端 SPA 路由，不出现在 API 路径中。

    Examples:
        get_api_base("http://172.16.124.78")          → "http://172.16.124.78"
        get_api_base("http://172.16.124.78/batch")    → "http://172.16.124.78"
        get_api_base("http://172.16.124.78:8080/foo") → "http://172.16.124.78:8080"
    """
    parsed = urlparse(base_url)
    return f"{parsed.scheme}://{parsed.netloc}"
