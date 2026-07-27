#!/usr/bin/env pwsh
# Run on the machine that HAS the BrightPath source (Windows):
#   cd C:\Users\gs-en\Projects\brightpath
#   pwsh -File scripts/push-to-github.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

if (-not (Test-Path .git)) {
    git init
}

git add -A
$status = git status --porcelain
if ($status) {
    git commit -m "Initial commit: BrightPath AI tutor PWA"
} else {
    Write-Host "Nothing to commit (already clean)."
}

Write-Host "Checking GitHub CLI auth..."
gh auth status

$names = @("brightpath", "brightpath-tutor", "brightpath-ai-tutor")
foreach ($name in $names) {
    Write-Host "Trying repo name: $name"
    try {
        if (git remote get-url origin 2>$null) {
            gh repo create $name --public --source=. --remote=origin --push --description "One-on-one AI tutoring in reading, writing and math for kids"
        } else {
            gh repo create $name --public --source=. --remote=origin --push --description "One-on-one AI tutoring in reading, writing and math for kids"
        }
        $url = gh repo view --json url -q .url
        Write-Host ""
        Write-Host "SUCCESS! Repo URL: $url"
        Write-Host ""
        Write-Host "On Linux, run:"
        Write-Host "  git clone $url ~/Projects/brightpath"
        Write-Host "  cd ~/Projects/brightpath && npm install && npm run dev"
        exit 0
    } catch {
        Write-Host "Name '$name' failed, trying next..."
        git remote remove origin 2>$null
    }
}

Write-Host "Failed to create repo. Run 'gh auth login' then retry."
exit 1
