@echo off
setlocal EnableExtensions

chcp 65001 >nul 2>nul

set "REMOTE_URL=https://github.com/yangyaotain/smart-query-prototype.git"
set "REPO_API=https://api.github.com/repos/yangyaotain/smart-query-prototype"

set "SOURCE_DIR=%~dp0"
for %%I in ("%SOURCE_DIR%.") do set "SOURCE_DIR=%%~fI"

set "WORK_ROOT=%SOURCE_DIR%\.codex-submit-test"
set "TOKEN_FILE=%WORK_ROOT%\github-token.txt"

echo ==========================================
echo Smart Query Prototype - Codex deploy token
echo ==========================================
echo.
echo This one-time setup lets Codex deploy for you later without browser login.
echo The token is stored locally here and is ignored by Git:
echo %TOKEN_FILE%
echo.
echo Create a GitHub fine-grained token with:
echo - Repository access: yangyaotain/smart-query-prototype
echo - Repository permission: Contents = Read and write
echo.
echo Opening GitHub token page...
start "" "https://github.com/settings/tokens?type=beta"
echo.
pause

if not exist "%WORK_ROOT%" mkdir "%WORK_ROOT%" >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Could not create local token folder:
  echo %WORK_ROOT%
  echo.
  pause
  exit /b 1
)

echo.
echo Paste the GitHub token in the next prompt. Input will be hidden.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$secure = Read-Host 'GitHub token' -AsSecureString; $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure); try { $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr); if ([string]::IsNullOrWhiteSpace($plain)) { exit 2 }; Set-Content -LiteralPath $env:TOKEN_FILE -Value $plain.Trim() -NoNewline -Encoding ASCII } finally { if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) } }"
if errorlevel 1 (
  echo.
  echo [ERROR] Token was not saved.
  pause
  exit /b 1
)

echo.
echo Verifying token permission...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$token = Get-Content -LiteralPath $env:TOKEN_FILE -Raw; $headers = @{ Authorization = 'Bearer ' + $token; 'User-Agent' = 'smart-query-prototype-deploy'; Accept = 'application/vnd.github+json' }; try { $repo = Invoke-RestMethod -Uri '%REPO_API%' -Headers $headers; if (-not $repo.permissions.push) { Write-Host '[ERROR] Token does not have push permission for this repository.'; exit 3 }; Write-Host '[OK] Token can push to this repository.' } catch { Write-Host ('[ERROR] GitHub API check failed: ' + $_.Exception.Message); exit 4 }"
if errorlevel 1 (
  echo.
  echo [ERROR] Token verification failed. Please create a token with Contents: Read and write.
  pause
  exit /b 1
)

echo.
echo Checking Git access...
git -c http.sslBackend=openssl ls-remote "%REMOTE_URL%" refs/heads/main
if errorlevel 1 (
  echo.
  echo [ERROR] Git access check failed.
  pause
  exit /b 1
)

echo.
echo [DONE] Codex deploy token is ready.
echo From now on, just tell Codex to deploy.
echo.
pause
