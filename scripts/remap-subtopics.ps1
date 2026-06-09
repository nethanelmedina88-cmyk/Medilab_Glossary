$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$gpath = Join-Path $root 'glossary.js'
$raw = Get-Content $gpath -Raw -Encoding utf8
$data = ($raw -replace '^\s*window\.GLOSSARY\s*=\s*','' -replace ';\s*$','') | ConvertFrom-Json

$map = Get-Content (Join-Path $root 'data\subtopic-remap.json') -Raw -Encoding utf8 | ConvertFrom-Json
$clear = @($map.clearSubjects)
$rename = $map.rename
$byTerm = $map.byTerm

function HasProp($obj, $name) { $obj.PSObject.Properties.Name -contains $name }

foreach ($t in $data) {
  $new = $null
  if ($clear -contains $t.subject) {
    $new = ''
  } elseif (HasProp $byTerm $t.hebrew) {
    $new = $byTerm.$($t.hebrew)
  } elseif ($t.PSObject.Properties.Name -contains 'subtopic' -and (HasProp $rename $t.subtopic)) {
    $new = $rename.$($t.subtopic)
  } else {
    $new = if (HasProp $t 'subtopic') { $t.subtopic } else { '' }
  }
  if ($new -and $new -ne '') {
    Add-Member -InputObject $t -NotePropertyName subtopic -NotePropertyValue $new -Force
  } elseif (HasProp $t 'subtopic') {
    $t.PSObject.Properties.Remove('subtopic')
  }
}

$body = ($data | ConvertTo-Json -Depth 6 -Compress)
Set-Content -Path $gpath -Value ("window.GLOSSARY = " + $body + ";") -Encoding utf8

"remapped subtopics for $($data.Count) terms"
"=== subtopic counts (subject :: subtopic) ==="
$data | Group-Object subject, subtopic | Sort-Object Name | ForEach-Object { "{0,-50} {1}" -f $_.Name, $_.Count }
"=== cleared subjects still having subtopic (should be 0) ==="
@($data | Where-Object { ($clear -contains $_.subject) -and ($_.PSObject.Properties.Name -contains 'subtopic') }).Count
