$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$gpath = Join-Path $root 'glossary.js'
$raw = Get-Content $gpath -Raw -Encoding utf8
$data = ($raw -replace '^\s*window\.GLOSSARY\s*=\s*','' -replace ';\s*$','') | ConvertFrom-Json

$cls = @()
foreach ($f in 'cls-0.json','cls-1.json','cls-2.json') {
  $cls += (Get-Content (Join-Path $root "data\$f") -Raw -Encoding utf8 | ConvertFrom-Json)
}
$cls = $cls | Sort-Object index

if ($cls.Count -ne $data.Count) { throw "count mismatch: cls=$($cls.Count) data=$($data.Count)" }

# Safety: abort if classification does not line up with the data by index+hebrew
$mismatch = 0
for ($i = 0; $i -lt $data.Count; $i++) {
  if ($cls[$i].index -ne $i) { throw "index drift at ${i}: cls.index=$($cls[$i].index)" }
  if ($cls[$i].hebrew -ne $data[$i].hebrew) { $mismatch++; Write-Host ("MISMATCH @{0}: cls='{1}' data='{2}'" -f $i,$cls[$i].hebrew,$data[$i].hebrew) }
}
if ($mismatch -gt 0) { throw "$mismatch hebrew mismatches - aborting, no changes written" }

for ($i = 0; $i -lt $data.Count; $i++) {
  $c = $cls[$i]
  Add-Member -InputObject $data[$i] -NotePropertyName subject -NotePropertyValue $c.subject -Force
  if ($c.subtopic) { Add-Member -InputObject $data[$i] -NotePropertyName subtopic -NotePropertyValue $c.subtopic -Force }
  if ($c.ambiguous -and $c.also) { Add-Member -InputObject $data[$i] -NotePropertyName subjectAlso -NotePropertyValue $c.also -Force }
}

$body = ($data | ConvertTo-Json -Depth 6 -Compress)
Set-Content -Path $gpath -Value ("window.GLOSSARY = " + $body + ";") -Encoding utf8

"applied subjects to $($data.Count) terms"
"=== distribution by subject ==="
$data | Group-Object subject | Sort-Object Count -Descending | ForEach-Object { "{0,-22} {1}" -f $_.Name, $_.Count }
"=== cross-listed (subjectAlso) ==="; @($data | Where-Object { $_.subjectAlso }).Count
"=== missing subject ==="; @($data | Where-Object { -not $_.subject }).Count
