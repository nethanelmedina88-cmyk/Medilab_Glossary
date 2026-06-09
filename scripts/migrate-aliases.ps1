$ErrorActionPreference = 'Stop'
$path = Join-Path $PSScriptRoot '..\glossary.js'
$raw  = Get-Content -Path $path -Raw -Encoding utf8
$json = $raw -replace '^\s*window\.GLOSSARY\s*=\s*','' -replace ';\s*$',''
$data = $json | ConvertFrom-Json

function Norm($s){ if(-not $s){return ''}; ($s -replace '[֑-ׇ"''׳״\-–—()]','' -replace '\s+',' ').Trim().ToLower() }
function StripParen($s){ ($s -replace '\(.*?\)','').Trim() }

# index by hebrew + normalized-hebrew
$byHeb = @{}; foreach($e in $data){ $byHeb[$e.hebrew] = $e }
$byNorm = @{}; foreach($e in $data){ $byNorm[(Norm $e.hebrew)] = $e }

# 1) alias stubs: definition "ראה: TARGET."
foreach($e in $data){
  if($e.definition -match '^\s*ראה:\s*(.+?)\.?\s*$'){
    $target = $Matches[1].Trim()
    $canon = $byHeb[$target]; if(-not $canon){ $canon = $byNorm[(Norm $target)] }
    if($canon){
      Add-Member -InputObject $e -NotePropertyName aliasOf -NotePropertyValue $canon.hebrew -Force
      $syn = @(); if($canon.PSObject.Properties.Name -contains 'synonyms'){ $syn = @($canon.synonyms) }
      if($syn -notcontains $e.hebrew){ $syn += $e.hebrew }
      Add-Member -InputObject $canon -NotePropertyName synonyms -NotePropertyValue $syn -Force
    }
  }
}

# 2) genuine synonyms: same normalized english, neither is a stub, not paren-disambiguated
$groups = $data | Group-Object { Norm $_.english } | Where-Object { $_.Count -gt 1 }
foreach($g in $groups){
  $members = @($g.Group | Where-Object { -not ($_.PSObject.Properties.Name -contains 'aliasOf') })
  if($members.Count -lt 2){ continue }
  $bases = $members | ForEach-Object { StripParen $_.hebrew } | Sort-Object -Unique
  if($bases.Count -eq 1){ continue }   # collapse to one base => differ only by parenthetical => NOT synonyms
  foreach($m in $members){
    $others = @($members | Where-Object { $_.hebrew -ne $m.hebrew } | ForEach-Object { $_.hebrew })
    $cur = @(); if($m.PSObject.Properties.Name -contains 'synonyms'){ $cur = @($m.synonyms) }
    foreach($o in $others){ if($cur -notcontains $o){ $cur += $o } }
    Add-Member -InputObject $m -NotePropertyName synonyms -NotePropertyValue $cur -Force
  }
}

$body = ($data | ConvertTo-Json -Depth 6 -Compress)
Set-Content -Path $path -Value ("window.GLOSSARY = " + $body + ";") -Encoding utf8
"migrated: $($data.Count) entries; aliases=$(@($data | Where-Object {$_.aliasOf}).Count); withSynonyms=$(@($data | Where-Object {$_.synonyms}).Count)"
