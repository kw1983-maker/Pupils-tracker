# Regenerates public/avatars/01.png .. 40.png from the avatar sprite sheets in
# docs/References/avatar/ (5x4 grid per sheet, one character with a caption
# below in each cell).
#
# Every avatar uses a crop box of the SAME size (= cell width * BoxFrac) so the
# zoom — and therefore the head/body proportions — is identical across all 40.
# The box is then anchored on each character's detected position (top of head
# horizontally centred) so heads line up and the caption never bleeds in, even
# though characters sit at slightly different spots within their cells.
#
#   BoxFrac  crop side as a fraction of cell WIDTH (smaller = more zoomed in)
#   TopPad   space above the head, as a fraction of the crop side
# Run from anywhere:  pwsh scripts/crop-avatars.ps1
param([int]$OutSize = 224, [double]$BoxFrac = 0.82, [double]$TopPad = 0.06)

# Ring-free 5x4 sheets (20 characters each) -> avatars 01..40.
$sheets = @(
  "Gemini_Generated_Image_vbxre3vbxre3vbxr.png",
  "Gemini_Generated_Image_riy17eriy17eriy1.png"
)

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$srcDir = Join-Path $root "docs\References\avatar"
$outDir = Join-Path $root "public\avatars"
New-Item -ItemType Directory -Force $outDir | Out-Null

$cols = 5
$rows = 4
$scanFrac = 0.74   # captions live in the bottom ~26%; only scan above them
$stride = 4
$n = 1

foreach ($sheet in $sheets) {
  $img = [System.Drawing.Bitmap]::FromFile((Join-Path $srcDir $sheet))
  $cellW = $img.Width / $cols
  $cellH = $img.Height / $rows
  $bg = $img.GetPixel(2, 2)
  $side = [int]($cellW * $BoxFrac)      # identical for every avatar

  for ($r = 0; $r -lt $rows; $r++) {
    for ($c = 0; $c -lt $cols; $c++) {
      $x0 = [int]($c * $cellW)
      $y0 = [int]($r * $cellH)
      $scanH = [int]($cellH * $scanFrac)

      # Per-row coverage of non-background pixels. The character is the densest,
      # contiguous block; a caption that bleeds in from the row above is a thin
      # band separated by a background gap, so we can ignore it.
      $den = @(); $rMinX = @(); $rMaxX = @()
      $peakRow = 0; $peakVal = -1
      for ($y = 0; $y -lt $scanH; $y += $stride) {
        $cnt = 0; $lo = [int]$cellW; $hi = 0
        for ($x = 0; $x -lt [int]$cellW; $x += $stride) {
          $p = $img.GetPixel($x0 + $x, $y0 + $y)
          $d = [Math]::Abs($p.R - $bg.R) + [Math]::Abs($p.G - $bg.G) + [Math]::Abs($p.B - $bg.B)
          if ($d -gt 45) { $cnt++; if ($x -lt $lo) { $lo = $x }; if ($x -gt $hi) { $hi = $x } }
        }
        $i = [int]($y / $stride)
        $den += $cnt; $rMinX += $lo; $rMaxX += $hi
        if ($cnt -gt $peakVal) { $peakVal = $cnt; $peakRow = $i }
      }

      # Walk up from the densest (head/body) row to the background gap = head top.
      $thr = [Math]::Max(2, [int]($peakVal * 0.10))
      $iTop = $peakRow
      while ($iTop -gt 0 -and $den[$iTop - 1] -ge $thr) { $iTop-- }
      $minY = $iTop * $stride

      # Horizontal centre from the head band only (keeps wide-armed poses centred).
      $bandRows = [Math]::Max(1, [int](($side * 0.55) / $stride))
      $minX = [int]$cellW; $maxX = 0
      for ($i = $iTop; $i -lt [Math]::Min($den.Count, $iTop + $bandRows); $i++) {
        if ($den[$i] -ge $thr) {
          if ($rMinX[$i] -lt $minX) { $minX = $rMinX[$i] }
          if ($rMaxX[$i] -gt $maxX) { $maxX = $rMaxX[$i] }
        }
      }

      # Centre horizontally on the character; anchor the top just above the head.
      $cx = $x0 + ($minX + $maxX) / 2
      $left = [int]($cx - $side / 2)
      $top = [int]($y0 + $minY - $side * $TopPad)
      # Keep the box fully inside this cell (no neighbour / caption bleed).
      $left = [Math]::Max($x0, [Math]::Min($left, $x0 + [int]$cellW - $side))
      $top = [Math]::Max($y0, [Math]::Min($top, $y0 + [int]$cellH - $side))

      $out = [System.Drawing.Bitmap]::new($OutSize, $OutSize)
      $g = [System.Drawing.Graphics]::FromImage($out)
      $g.Clear($bg)
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $g.DrawImage($img,
        [System.Drawing.RectangleF]::new(0, 0, $OutSize, $OutSize),
        [System.Drawing.RectangleF]::new($left, $top, $side, $side),
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

Write-Output "Wrote $($n - 1) avatars to $outDir (BoxFrac=$BoxFrac, TopPad=$TopPad)"
