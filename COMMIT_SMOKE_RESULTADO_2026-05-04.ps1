# Commit informe smoke + entrada feedback (doc-only)

Set-Location C:\Users\joliv\valere-v2

if (Test-Path .git\index.lock) {
  Remove-Item .git\index.lock -Force
}

Write-Host "=== Pull main ===" -ForegroundColor Cyan
git checkout main
git pull origin main --ff-only
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "=== Stage docs ===" -ForegroundColor Cyan
git add -- docs/SMOKE_TEST_RESULTADO_2026-05-04.md docs/FEEDBACK_USO_REAL.md
git diff --staged --stat

git commit -F COMMIT_MSG_SMOKE_RESULTADO.txt
if ($LASTEXITCODE -ne 0) { exit 1 }

git push origin main
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "=== HECHO ===" -ForegroundColor Green
git log --oneline -5
