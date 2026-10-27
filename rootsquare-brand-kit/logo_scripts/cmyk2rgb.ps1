param([string]$In, [string]$Out, [string]$Profile)
# Forward-transform raw CMYK bytes (4 per pixel) through a CMYK ICC profile into sRGB
# (3 bytes per pixel, BGR order), using Windows Color System.
Add-Type -AssemblyName PresentationCore
$bytes = [IO.File]::ReadAllBytes($In)
$n = $bytes.Length / 4
$src = [System.Windows.Media.Imaging.BitmapSource]::Create($n, 1, 96, 96, [System.Windows.Media.PixelFormats]::Cmyk32, $null, $bytes, 4 * $n)
$cmykCtx = New-Object System.Windows.Media.ColorContext([Uri]$Profile)
$srgbCtx = New-Object System.Windows.Media.ColorContext([Uri]'C:/Windows/System32/spool/drivers/color/sRGB Color Space Profile.icm')
$cc = New-Object System.Windows.Media.Imaging.ColorConvertedBitmap($src, $cmykCtx, $srgbCtx, [System.Windows.Media.PixelFormats]::Bgr24)
$res = New-Object byte[] (3 * $n)
$cc.CopyPixels($res, 3 * $n, 0)
[IO.File]::WriteAllBytes($Out, $res)
