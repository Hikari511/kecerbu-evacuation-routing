$ErrorActionPreference = 'Stop'

$testFiles = @(
  'tests/astar.node.test.js',
  'tests/weighted.test.js',
  'tests/mapData.test.js',
  'tests/explored.test.js',
  'tests/presets.test.js',
  'tests/progress2.test.js',
  'tests/progress3.test.js',
  'tests/osmGraph.test.js'
)

$totalPass = 0
$totalFail = 0
$failedSuites = @()

Write-Host ''
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' EvaTour - Complete Automated Test Report' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ''

foreach ($testFile in $testFiles) {
  Write-Host ("Running {0} ..." -f $testFile) -NoNewline

  $output = & node $testFile 2>&1 | Out-String
  $exitCode = $LASTEXITCODE
  $summary = [regex]::Match(
    $output,
    'Total:\s*(\d+)\s*\|.*?(\d+)\s*pass\s*\|.*?(\d+)\s*fail',
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
  )

  if (-not $summary.Success) {
    Write-Host ' ERROR' -ForegroundColor Red
    Write-Host $output
    $failedSuites += $testFile
    continue
  }

  $suitePass = [int]$summary.Groups[2].Value
  $suiteFail = [int]$summary.Groups[3].Value
  $totalPass += $suitePass
  $totalFail += $suiteFail

  if ($exitCode -eq 0 -and $suiteFail -eq 0) {
    Write-Host (" PASS ({0} tests)" -f $suitePass) -ForegroundColor Green
  } else {
    Write-Host (" FAIL ({0} failed)" -f $suiteFail) -ForegroundColor Red
    $failedSuites += $testFile
  }
}

Write-Host ''
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host (" TOTAL PASSED : {0}" -f $totalPass) -ForegroundColor Green
Write-Host (" TOTAL FAILED : {0}" -f $totalFail) -ForegroundColor $(if ($totalFail -eq 0) { 'Green' } else { 'Red' })
Write-Host (" TEST SUITES  : {0}" -f $testFiles.Count)
Write-Host '============================================================' -ForegroundColor Cyan

if ($totalFail -eq 0 -and $failedSuites.Count -eq 0) {
  Write-Host ' RESULT: ALL TESTS PASSED' -ForegroundColor Green
  exit 0
}

Write-Host ' RESULT: TEST FAILURE DETECTED' -ForegroundColor Red
exit 1
