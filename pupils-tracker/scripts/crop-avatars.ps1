# Regenerates public/avatars/01.png .. 40.png from the two avatar sprite
# sheets in docs/References/avatar/ (5x4 grid per sheet, oval portrait with a
# caption below in each cell). Finds the oval in each cell by scanning for
# pixels that differ from the sheet's background, then crops a square centered
# on it. Run from anywhere:
#   pwsh scripts/crop-avatars.ps1
param([int]$OutSize = 160)

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$srcDir = Join-Path $root "docs\References\avatar"
$outDir = Join-Path $root "public\avatars"
New-Item -ItemType Directory -Force $outDir | Out-Null

$cols = 5
$rows = 4
# Captions sit in the bottom ~22% of each cell; only scan above them.
$scanFrac = 0.78
$stride = 4    # sample every 4th pixel; plenty for a ~310px-wide oval
$n = 1

foreach ($sheet in @("1.png", "2.png")) {
  $img = [System.Drawing.Bitmap]::FromFile((Join-Path $srcDir $sheet))
  $cellW = $img.Width / $cols
  $cellH = $img.Height / $rows
  $bg = $img.GetPixel(2, 2)

  for ($r = 0; $r -lt $rows; $r++) {
    for ($c = 0; $c -lt $cols; $c++) {
      $x0 = [int]($c * $cellW)
      $y0 = [int]($r * $cellH)
      $minX = [int]$cellW; $maxX = 0
      $minY = [int]($cellH * $scanFrac); $maxY = 0

      for ($y = 0; $y -lt [int]($cellH * $scanFrac); $y += $stride) {
        for ($x = 0; $x -lt [int]$cellW; $x += $stride) {
          $p = $img.GetPixel($x0 + $x, $y0 + $y)
          $d = [Math]::Abs($p.R - $bg.R) + [Math]::Abs($p.G - $bg.G) + [Math]::Abs($p.B - $bg.B)
          if ($d -gt 45) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
          }
        }
      }

      $ovalW = $maxX - $minX
      $ovalH = $maxY - $minY
      $cx = $x0 + ($minX + $maxX) / 2
      $cy = $y0 + ($minY + $maxY) / 2
      # Compromise between oval width and height: trims a sliver off the top
      # and bottom of the ring instead of leaving wide background margins.
      $side = [int](($ovalW + $ovalH) / 2)
      $srcRect = [System.Drawing.Rectangle]::new(
        [int]($cx - $side / 2), [int]($cy - $side / 2), $side, $side)
      # Only draw the part of the square that lies inside this avatar's own
      # cell; anything beyond (neighboring ovals) becomes flat background.
      $cellRect = [System.Drawing.Rectangle]::new($x0, $y0, [int]$cellW, [int]$cellH)
      $clipped = [System.Drawing.Rectangle]::Intersect($srcRect, $cellRect)
      $scale = $OutSize / $side
      $destRect = [System.Drawing.RectangleF]::new(
        ($clipped.X - $srcRect.X) * $scale, ($clipped.Y - $srcRect.Y) * $scale,
        $clipped.Width * $scale, $clipped.Height * $scale)

      $out = [System.Drawing.Bitmap]::new($OutSize, $OutSize)
      $g = [System.Drawing.Graphics]::FromImage($out)
      $g.Clear($bg)
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.DrawImage($img, $destRect,
        [System.Drawing.RectangleF]::new($clipped.X, $clipped.Y, $clipped.Width, $clipped.Height),
        [System.Drawing.GraphicsUnit]::Pixel)
      $g.Dispose()

      $name = "{0:d2}.png" -f $n
      $out.Save((Join-Path $outDir $name), [System.Drawing.Imaging.ImageFormat]::Png)
      $out.Dispose()
      $n++
    }
  }
  $img.Dispose()
}

Write-Output "Wrote $($n - 1) avatars to $outDir"
