Set-Location $PSScriptRoot
Remove-Item .git\index.lock -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 300

git add .github/workflows/fv-sync.yml
git commit -m "fix(fv-sync): fijar ubuntu-22.04 (ubuntu-latest=24.04 rompe libasound2)

ubuntu-latest migro a Ubuntu 24.04 donde libasound2 no es instalable directamente.
Playwright 1.44 lo necesita en --with-deps. ubuntu-22.04 lo tiene disponible."

git push origin main

Write-Host "Listo. Ahora lanza Run #13 desde GitHub Actions." -ForegroundColor Green
