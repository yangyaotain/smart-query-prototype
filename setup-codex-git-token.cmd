@echo off
setlocal EnableExtensions

chcp 65001 >nul 2>nul

set "SOURCE_DIR=%~dp0"
for %%I in ("%SOURCE_DIR%.") do set "SOURCE_DIR=%%~fI"

set "WORK_ROOT=%SOURCE_DIR%\.codex-submit-test"
set "TOKEN_FILE=%WORK_ROOT%\github-token.txt"
set "ASKPASS_FILE=%WORK_ROOT%\git-askpass.cmd"

if /I "%~1"=="--check" goto CHECK_ONLY

echo ==========================================
echo Codex deploy token setup
echo ==========================================
echo.
echo This one-time setup lets Codex deploy for you later without browser login.
echo The token is stored locally here and is ignored by Git:
echo %TOKEN_FILE%
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git was not found. Please install Git from https://git-scm.com/
  echo.
  pause
  exit /b 1
)

call :DETECT_REPO
if errorlevel 1 (
  echo.
  pause
  exit /b 1
)

echo Repository: %REPO_SLUG%
echo Remote: %REMOTE_URL%
echo Deploy URL: %DEPLOY_URL%
echo.
echo Create a GitHub fine-grained token with:
echo - Repository access: %REPO_SLUG%
echo - Repository permission: Contents = Read and write
echo.
echo Opening GitHub token page...
start "" "https://github.com/settings/tokens?type=beta"
echo.
pause

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
powershell -NoProfile -ExecutionPolicy Bypass -Command "$token = Get-Content -LiteralPath $env:TOKEN_FILE -Raw; $headers = @{ Authorization = 'Bearer ' + $token; 'User-Agent' = 'codex-git-deploy'; Accept = 'application/vnd.github+json' }; try { $repo = Invoke-RestMethod -Uri ('https://api.github.com/repos/' + $env:REPO_SLUG) -Headers $headers; if (-not $repo.permissions.push) { Write-Host '[ERROR] Token does not have push permission for this repository.'; exit 3 }; Write-Host '[OK] Token can push to this repository.' } catch { Write-Host ('[ERROR] GitHub API check failed: ' + $_.Exception.Message); exit 4 }"
if errorlevel 1 (
  echo.
  echo [ERROR] Token verification failed. Please create a token with Contents: Read and write.
  pause
  exit /b 1
)

call :WRITE_ASKPASS
set "GIT_ASKPASS=%ASKPASS_FILE%"
set "GIT_TERMINAL_PROMPT=0"

echo.
echo Checking Git access...
git -c http.sslBackend=openssl ls-remote "%DEPLOY_URL%" HEAD
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

exit /b 0

:DETECT_REPO
if defined CODEX_DEPLOY_REMOTE (
  set "REMOTE_URL=%CODEX_DEPLOY_REMOTE%"
) else (
  for /f "usebackq delims=" %%R in (`git -C "%SOURCE_DIR%" remote get-url origin 2^>nul`) do set "REMOTE_URL=%%R"
)
if not defined REMOTE_URL (
  echo [ERROR] Could not detect Git remote origin. Set CODEX_DEPLOY_REMOTE or add an origin remote.
  exit /b 1
)

set "CODEX_REMOTE_RAW=%REMOTE_URL%"
for /f "usebackq tokens=1,* delims=|" %%A in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$u=$env:CODEX_REMOTE_RAW; if ($u -match 'github\.com[:/](?<slug>[^/]+/[^/.]+)(?:\.git)?/?$') { $slug=$Matches.slug; 'OK|' + $slug + '|https://github.com/' + $slug + '.git' } else { 'ERR||' }"`) do (
  set "PARSE_STATUS=%%A"
  set "PARSE_REST=%%B"
)

if not "%PARSE_STATUS%"=="OK" (
  echo [ERROR] This setup script currently supports GitHub remotes only.
  echo Remote was: %REMOTE_URL%
  exit /b 1
)

for /f "tokens=1,* delims=|" %%A in ("%PARSE_REST%") do (
  set "REPO_SLUG=%%A"
  set "DEPLOY_URL=%%B"
)

if not exist "%WORK_ROOT%" mkdir "%WORK_ROOT%" >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Could not create local token folder:
  echo %WORK_ROOT%
  exit /b 1
)
exit /b 0

:WRITE_ASKPASS
(
  echo @echo off
  echo echo %%~1 ^| findstr /i "Username" ^>nul ^&^& echo x-access-token ^&^& exit /b 0
  echo set /p TOKEN^=^<"%TOKEN_FILE%"
  echo echo %%TOKEN%%
) > "%ASKPASS_FILE%"
exit /b 0

:CHECK_ONLY
echo setup-codex-git-token.cmd check
echo Source: %SOURCE_DIR%
where git >nul 2>nul && echo Git: OK || echo Git: missing
call :DETECT_REPO
if not errorlevel 1 (
  echo Repository: %REPO_SLUG%
  echo Remote: %REMOTE_URL%
  echo Deploy URL: %DEPLOY_URL%
  echo Token file: %TOKEN_FILE%
)
exit /b 0
