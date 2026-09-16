param(
  [string]$Format = "pdf"
)

if (-not (Get-Command pandoc -ErrorAction SilentlyContinue)) {
  Write-Host "Pandoc n'est pas installé. Installez pandoc pour exporter (https://pandoc.org/)."
  exit 1
}

$in = "REPORT_STAGE.md"
switch ($Format.ToLower()) {
  "pdf" { pandoc $in -o REPORT_STAGE.pdf; Write-Host "REPORT_STAGE.pdf créé." }
  "docx" { pandoc $in -o REPORT_STAGE.docx; Write-Host "REPORT_STAGE.docx créé." }
  default { Write-Host "Format non supporté. Utiliser 'pdf' ou 'docx'" }
}
