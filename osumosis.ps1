param([ValidateSet('start', 'stop', 'dev', 'build', 'install', 'index')][string]$Action = 'start', [Parameter(ValueFromRemainingArguments=$true)][string[]]$ExtraArgs)
$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$runtimeCandidates = @(
  (Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'),
  'C:\Program Files\nodejs\node.exe'
)
$runtime = $null
foreach ($candidate in $runtimeCandidates) {
  if (Test-Path -LiteralPath $candidate) {
    $version = & $candidate -p 'process.versions.node'
    if ([version]$version -ge [version]'22.12.0') { $runtime = $candidate; break }
  }
}
if (!$runtime) { throw 'Node 22.12+ requis. Installer une version LTS récente de Node.js.' }
$env:PATH = (Split-Path -Parent $runtime) + ';' + $env:PATH
$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (!$npmCommand) { throw 'npm est introuvable. Installer Node.js avec npm.' }
$npmCli = Join-Path (Split-Path -Parent $npmCommand.Source) 'node_modules\npm\bin\npm-cli.js'
if (!(Test-Path -LiteralPath $npmCli)) { throw 'npm-cli.js est introuvable.' }
Push-Location -LiteralPath $projectRoot
try {
  if ($Action -eq 'install') { & $runtime $npmCli install --cache .cache/npm }
  elseif ($Action -eq 'start') { & $runtime bin/osumosis.mjs @ExtraArgs }
  elseif ($Action -eq 'stop') { & $runtime bin/osumosis.mjs stop }
  else { & $runtime $npmCli run $Action -- @ExtraArgs }
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally { Pop-Location }
