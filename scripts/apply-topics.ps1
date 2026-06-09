$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$gpath = Join-Path $root 'glossary.js'
$data = ((Get-Content $gpath -Raw -Encoding utf8) -replace '^\s*window\.GLOSSARY\s*=\s*','' -replace ';\s*$','') | ConvertFrom-Json

$ttm = Get-Content (Join-Path $root 'data\term-topic-map.json') -Raw -Encoding utf8 | ConvertFrom-Json
$der = Get-Content (Join-Path $root 'data\topic-derive.json') -Raw -Encoding utf8 | ConvertFrom-Json
$ttmNames = $ttm.PSObject.Properties.Name
$subNames = $der.bySubtopic.PSObject.Properties.Name
$sjNames  = $der.bySubject.PSObject.Properties.Name

$fromMap = 0; $fromSub = 0; $fromSj = 0; $missing = @()
foreach ($t in $data) {
  $topic = $null
  if ($ttmNames -contains $t.hebrew) { $topic = $ttm.$($t.hebrew); $fromMap++ }
  elseif (($t.PSObject.Properties.Name -contains 'subtopic') -and ($subNames -contains $t.subtopic)) { $topic = $der.bySubtopic.$($t.subtopic); $fromSub++ }
  elseif ($sjNames -contains $t.subject) { $topic = $der.bySubject.$($t.subject); $fromSj++ }
  else { $missing += $t.hebrew }
  if ($topic) { Add-Member -InputObject $t -NotePropertyName topic -NotePropertyValue $topic -Force }
}

$body = ($data | ConvertTo-Json -Depth 6 -Compress)
Set-Content -Path $gpath -Value ("window.GLOSSARY = " + $body + ";") -Encoding utf8

"topic applied: fromOriginalMap=$fromMap  fromSubtopic=$fromSub  fromSubject=$fromSj  missing=$($missing.Count)"
if ($missing.Count) { "MISSING:"; $missing }
"=== distribution by topic ==="
$data | Group-Object topic | Sort-Object Count -Descending | ForEach-Object { "{0,-36} {1}" -f $_.Name, $_.Count }
