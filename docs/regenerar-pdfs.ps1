# Regenera os PDFs a partir dos HTML (requer Microsoft Edge instalado).
$docs = Split-Path -Parent $MyInvocation.MyCommand.Path
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) {
  $edge = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
}
if (-not (Test-Path $edge)) {
  Write-Error "msedge.exe nao encontrado."
  exit 1
}
$jobs = @(
  @{ Html = "QRPSI-Recursos-da-Plataforma.html"; Pdf = "QRPSI-Recursos-da-Plataforma.pdf" },
  @{ Html = "QRPSI-Recursos-Executivo.html"; Pdf = "QRPSI-Recursos-Executivo.pdf" }
)
foreach ($j in $jobs) {
  $in = Join-Path $docs $j.Html
  $out = Join-Path $docs $j.Pdf
  $uri = "file:///$($in -replace '\\','/')"
  & $edge --headless --disable-gpu --print-to-pdf="$out" $uri
  Write-Host "Gerado: $out"
}
