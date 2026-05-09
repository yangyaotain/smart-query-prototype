@echo off
setlocal EnableExtensions EnableDelayedExpansion

chcp 65001 >nul 2>nul

set "SOURCE_DIR=%~dp0"
for %%I in ("%SOURCE_DIR%.") do set "SOURCE_DIR=%%~fI"

set "WORK_ROOT=%SOURCE_DIR%\.codex-submit-test"
set "DEPLOY_DIR=%WORK_ROOT%\publish-worktree"
set "DEPLOY_DIR_GIT=%DEPLOY_DIR:\=/%"
set "TOKEN_FILE=%WORK_ROOT%\github-token.txt"
set "ASKPASS_FILE=%WORK_ROOT%\git-askpass.cmd"
set "NO_PAUSE=0"
set "NO_LOGIN=0"
set "USE_TOKEN=0"

if /I "%~1"=="--check" goto CHECK_ONLY
if /I "%~1"=="--ci" (
  set "NO_PAUSE=1"
  set "NO_LOGIN=1"
)

echo ==========================================
echo Codex one-click Git deploy
echo ==========================================
echo.
echo Source: %SOURCE_DIR%
echo.

call :REQUIRE_TOOL git "Git was not found. Please install Git from https://git-scm.com/"
if errorlevel 1 goto FAIL

call :DETECT_REPO
if errorlevel 1 goto FAIL

echo Remote: %REMOTE_URL%
echo Branch: %BRANCH%
echo Deploy URL: %DEPLOY_URL%
echo.

if not exist "%WORK_ROOT%" mkdir "%WORK_ROOT%" >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Could not create deploy workspace:
  echo %WORK_ROOT%
  goto FAIL
)

if exist "%TOKEN_FILE%" (
  set "USE_TOKEN=1"
  call :WRITE_ASKPASS
  set "GIT_ASKPASS=%ASKPASS_FILE%"
  set "GIT_TERMINAL_PROMPT=0"
  echo Using saved local deploy token.
) else (
  call :REQUIRE_TOOL gh "GitHub CLI was not found. Please install GitHub CLI from https://cli.github.com/"
  if errorlevel 1 goto FAIL

  echo Checking GitHub login...
  gh auth status >nul 2>nul
  if errorlevel 1 (
    if "%NO_LOGIN%"=="1" (
      echo.
      echo [ERROR] No local deploy token was found and GitHub CLI is not logged in.
      echo Run setup-codex-git-token.cmd once, then ask Codex to deploy again.
      goto FAIL
    )
    echo.
    echo GitHub login is required.
    echo A browser page will open. Sign in, authorize GitHub CLI, then return here.
    echo.
    gh auth login -h github.com -w
    if errorlevel 1 (
      echo.
      echo [ERROR] GitHub login failed.
      goto FAIL
    )
  )

  echo.
  echo Preparing GitHub credentials for Git...
  gh auth setup-git
  if errorlevel 1 (
    echo [ERROR] Could not configure GitHub credentials for Git.
    goto FAIL
  )
)

echo.
echo Preparing deploy workspace...
if exist "%DEPLOY_DIR%\.git" (
  git config --global --add safe.directory "%DEPLOY_DIR_GIT%" >nul 2>nul
  git -c safe.directory="%DEPLOY_DIR_GIT%" -C "%DEPLOY_DIR%" remote set-url origin "%DEPLOY_URL%"
  git -c safe.directory="%DEPLOY_DIR_GIT%" -C "%DEPLOY_DIR%" -c http.sslBackend=openssl fetch origin "%BRANCH%"
  if errorlevel 1 goto GIT_FAIL
  git -c safe.directory="%DEPLOY_DIR_GIT%" -C "%DEPLOY_DIR%" checkout "%BRANCH%"
  if errorlevel 1 goto GIT_FAIL
  git -c safe.directory="%DEPLOY_DIR_GIT%" -C "%DEPLOY_DIR%" reset --hard "origin/%BRANCH%"
  if errorlevel 1 goto GIT_FAIL
) else (
  if exist "%DEPLOY_DIR%" rmdir /s /q "%DEPLOY_DIR%"
  git -c http.sslBackend=openssl clone --branch "%BRANCH%" "%DEPLOY_URL%" "%DEPLOY_DIR%"
  if errorlevel 1 goto GIT_FAIL
  git config --global --add safe.directory "%DEPLOY_DIR_GIT%" >nul 2>nul
)

git -c safe.directory="%DEPLOY_DIR_GIT%" -C "%DEPLOY_DIR%" config user.name "codex-deploy"
git -c safe.directory="%DEPLOY_DIR_GIT%" -C "%DEPLOY_DIR%" config user.email "codex-deploy@users.noreply.github.com"
git -c safe.directory="%DEPLOY_DIR_GIT%" -C "%DEPLOY_DIR%" config core.autocrlf false

echo.
echo Syncing current project files...
robocopy "%SOURCE_DIR%" "%DEPLOY_DIR%" /MIR /XD ".git" ".codex-submit-test" /R:2 /W:1 /NFL /NDL /NJH /NJS /NC /NS >nul
set "ROBOCOPY_CODE=%ERRORLEVEL%"
if %ROBOCOPY_CODE% GEQ 8 (
  echo [ERROR] File sync failed. Robocopy exit code: %ROBOCOPY_CODE%
  goto FAIL
)

echo.
echo Creating commit if files changed...
git -c safe.directory="%DEPLOY_DIR_GIT%" -C "%DEPLOY_DIR%" add -A
if errorlevel 1 goto GIT_FAIL

git -c safe.directory="%DEPLOY_DIR_GIT%" -C "%DEPLOY_DIR%" diff --cached --quiet
set "DIFF_CODE=%ERRORLEVEL%"

if "%DIFF_CODE%"=="0" (
  echo No file changes detected. Will still check whether there is anything to push.
) else if "%DIFF_CODE%"=="1" (
  for /f %%T in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm"') do set "STAMP=%%T"
  if not defined STAMP set "STAMP=%DATE%_%TIME%"
  git -c safe.directory="%DEPLOY_DIR_GIT%" -C "%DEPLOY_DIR%" commit -m "chore: deploy prototype update !STAMP!"
  if errorlevel 1 goto GIT_FAIL
) else (
  echo [ERROR] Could not inspect staged changes.
  goto FAIL
)

echo.
echo Latest local commit:
git -c safe.directory="%DEPLOY_DIR_GIT%" -C "%DEPLOY_DIR%" log -1 --oneline

echo.
echo Pushing to GitHub...
git -c safe.directory="%DEPLOY_DIR_GIT%" -C "%DEPLOY_DIR%" -c http.sslBackend=openssl push origin "%BRANCH%"
if errorlevel 1 (
  echo.
  echo Push failed once. Trying to rebase on latest origin/%BRANCH% and push again...
  git -c safe.directory="%DEPLOY_DIR_GIT%" -C "%DEPLOY_DIR%" -c http.sslBackend=openssl fetch origin "%BRANCH%"
  if errorlevel 1 goto GIT_FAIL
  git -c safe.directory="%DEPLOY_DIR_GIT%" -C "%DEPLOY_DIR%" rebase "origin/%BRANCH%"
  if errorlevel 1 (
    echo.
    echo [ERROR] Rebase failed. Keep this window open and send the text to Codex.
    goto FAIL
  )
  git -c safe.directory="%DEPLOY_DIR_GIT%" -C "%DEPLOY_DIR%" -c http.sslBackend=openssl push origin "%BRANCH%"
  if errorlevel 1 goto GIT_FAIL
)

echo.
echo Verifying remote branch...
git -c safe.directory="%DEPLOY_DIR_GIT%" -C "%DEPLOY_DIR%" -c http.sslBackend=openssl ls-remote origin "refs/heads/%BRANCH%"
if errorlevel 1 goto GIT_FAIL

echo.
echo [DONE] Git push is complete. Deployment should update from GitHub.
echo.
if not "%NO_PAUSE%"=="1" pause
exit /b 0

:CHECK_ONLY
echo deploy-update.cmd check
echo Source: %SOURCE_DIR%
echo Work root: %WORK_ROOT%
echo Deploy dir: %DEPLOY_DIR%
where git >nul 2>nul && echo Git: OK || echo Git: missing
where gh >nul 2>nul && echo GitHub CLI: OK || echo GitHub CLI: missing
call :DETECT_REPO
if not errorlevel 1 (
  echo Remote: %REMOTE_URL%
  echo Branch: %BRANCH%
  echo Deploy URL: %DEPLOY_URL%
)
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

if defined CODEX_DEPLOY_BRANCH (
  set "BRANCH=%CODEX_DEPLOY_BRANCH%"
) else (
  for /f "usebackq delims=" %%B in (`git -C "%SOURCE_DIR%" branch --show-current 2^>nul`) do set "BRANCH=%%B"
)
if not defined BRANCH set "BRANCH=main"

set "CODEX_REMOTE_RAW=%REMOTE_URL%"
for /f "usebackq delims=" %%U in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$u=$env:CODEX_REMOTE_RAW; if ($u -match 'github\.com[:/](?<slug>[^/]+/[^/.]+)(?:\.git)?/?$') { 'https://github.com/' + $Matches.slug + '.git' } else { $u }"`) do set "DEPLOY_URL=%%U"
if not defined DEPLOY_URL set "DEPLOY_URL=%REMOTE_URL%"
exit /b 0

:REQUIRE_TOOL
where %~1 >nul 2>nul
if errorlevel 1 (
  echo [ERROR] %~2
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

:GIT_FAIL
echo.
echo [ERROR] Git command failed. Keep this window open and send the text to Codex.
goto FAIL

:FAIL
echo.
echo Operation stopped.
echo.
if not "%NO_PAUSE%"=="1" pause
exit /b 1
