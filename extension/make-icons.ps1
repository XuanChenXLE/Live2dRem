# 生成 Rem 扩展简易 icon：紫底圆角 + 白色 R（小尺寸也清晰）
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$outDir = Join-Path $PSScriptRoot 'icons'
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$s = 128
$bmp = New-Object System.Drawing.Bitmap($s, $s)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'AntiAlias'

$r = 28
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddArc(0, 0, 2 * $r, 2 * $r, 180, 90)
$path.AddArc($s - 2 * $r, 0, 2 * $r, 2 * $r, 270, 90)
$path.AddArc($s - 2 * $r, $s - 2 * $r, 2 * $r, 2 * $r, 0, 90)
$path.AddArc(0, $s - 2 * $r, 2 * $r, 2 * $r, 90, 90)
$path.CloseFigure()

$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Point(0, 0)),
  (New-Object System.Drawing.Point($s, $s)),
  ([System.Drawing.Color]::FromArgb(106, 90, 205)),
  ([System.Drawing.Color]::FromArgb(74, 59, 114)))
$g.FillPath($brush, $path)

$font = New-Object System.Drawing.Font('Arial', ($s * 0.62), ([System.Drawing.FontStyle]::Bold))
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = 'Center'
$sf.LineAlignment = 'Center'
$rect = New-Object System.Drawing.RectangleF(0, ($s * 0.02), $s, $s)
$g.DrawString('R', $font, [System.Drawing.Brushes]::White, $rect, $sf)

$font.Dispose()
$g.Dispose()
$bmp.Save((Join-Path $outDir 'icon128.png'), [System.Drawing.Imaging.ImageFormat]::Png)
foreach ($z in @(48, 16)) {
  $small = New-Object System.Drawing.Bitmap($bmp, $z, $z)
  $small.Save((Join-Path $outDir ("icon$z.png")), [System.Drawing.Imaging.ImageFormat]::Png)
  $small.Dispose()
}
$bmp.Dispose()
Write-Output 'icons done'
