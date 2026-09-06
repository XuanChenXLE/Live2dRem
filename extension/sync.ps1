# 同步主站 live2d/ 到插件目录
# 用法：在仓库根目录运行：
#   powershell -ExecutionPolicy Bypass -File extension\sync.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$src = Join-Path $root 'live2d'
$dst = Join-Path $PSScriptRoot 'live2d'
if (!(Test-Path -LiteralPath $src)) { throw "找不到 $src" }
if (Test-Path -LiteralPath $dst) { Remove-Item -Recurse -Force -LiteralPath $dst }
Copy-Item -Recurse -Path $src -Destination $dst
Write-Output "已同步 $src -> $dst"
