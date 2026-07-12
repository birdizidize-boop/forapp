param(
  [string]$Region = "eu-central-1",
  [string]$AppName = "fora-cmp-api",
  [string]$EnvName = "fora-cmp-api-prod",
  [string]$FrontendOrigin = "https://main.d2vde1biowsl7i.amplifyapp.com",
  [string]$DatabaseUrl = "sqlite:////tmp/fora_cmp.db",
  [string]$AmplifyAppId = "d2vde1biowsl7i",
  [string]$AmplifyBranch = "main",
  [switch]$SkipAmplifyUpdate
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $repoRoot "backend"
$artifactsRoot = Join-Path $repoRoot "artifacts"
$toolsRoot = Join-Path $repoRoot ".tools"
$awsCliVenv = Join-Path $toolsRoot "awscli"

function Resolve-AwsCli {
  $systemAws = Get-Command aws -ErrorAction SilentlyContinue
  if ($systemAws) {
    return $systemAws.Source
  }

  $python = Join-Path $awsCliVenv "Scripts\python.exe"
  $aws = Join-Path $awsCliVenv "Scripts\aws.exe"
  if (-not (Test-Path $aws)) {
    New-Item -ItemType Directory -Force -Path $toolsRoot | Out-Null
    $runtimePython = "C:\Users\NOKTA\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
    if (-not (Test-Path $runtimePython)) {
      $runtimePython = "python"
    }
    & $runtimePython -m venv $awsCliVenv
    & $python -m pip install --upgrade pip
    & $python -m pip install awscli
  }
  return $aws
}

function Invoke-AwsJson([string[]]$Arguments) {
  $output = & $script:AwsPath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "AWS CLI failed: aws $($Arguments -join ' ')"
  }
  if (-not $output) {
    return $null
  }
  return ($output | ConvertFrom-Json)
}

function Ensure-AwsIdentity {
  try {
    return Invoke-AwsJson @("sts", "get-caller-identity", "--region", $Region, "--output", "json")
  } catch {
    throw @"
AWS hesabı henüz CLI tarafında bağlı değil.

Bir kere giriş yap:
  aws configure

veya SSO kullanıyorsan:
  aws configure sso
  aws sso login --profile <profile-adı>

Sonra bu script'i aynı parametrelerle tekrar çalıştır.
"@
  }
}

function New-BackendBundle {
  New-Item -ItemType Directory -Force -Path $artifactsRoot | Out-Null
  $stamp = Get-Date -Format "yyyyMMddHHmmss"
  $bundlePath = Join-Path $artifactsRoot "fora-cmp-api-$stamp.zip"
  $stagingRoot = Join-Path $artifactsRoot "backend-bundle-$stamp"

  if (Test-Path $stagingRoot) {
    Remove-Item -LiteralPath $stagingRoot -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path $stagingRoot | Out-Null

  $excludeDirs = @("\.venv\", "\__pycache__\", "\instance\")
  $excludeFiles = @(".env", ".env.production", ".env.local")
  Get-ChildItem -Path $backendRoot -Recurse -File | ForEach-Object {
    $fullName = $_.FullName
    foreach ($excluded in $excludeDirs) {
      if ($fullName.Contains($excluded)) {
        return
      }
    }
    if ($_.Name -in $excludeFiles -or $_.Extension -eq ".pyc") {
      return
    }
    $relative = $fullName.Substring($backendRoot.Length).TrimStart("\", "/")
    $target = Join-Path $stagingRoot $relative
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
    Copy-Item -LiteralPath $fullName -Destination $target
  }

  if (Test-Path $bundlePath) {
    Remove-Item -LiteralPath $bundlePath -Force
  }
  Compress-Archive -Path (Join-Path $stagingRoot "*") -DestinationPath $bundlePath -Force
  Remove-Item -LiteralPath $stagingRoot -Recurse -Force
  return $bundlePath
}

function Ensure-Bucket([string]$BucketName) {
  & $script:AwsPath s3api head-bucket --bucket $BucketName --region $Region 2>$null
  if ($LASTEXITCODE -eq 0) {
    return
  }

  if ($Region -eq "us-east-1") {
    & $script:AwsPath s3api create-bucket --bucket $BucketName --region $Region | Out-Null
  } else {
    & $script:AwsPath s3api create-bucket --bucket $BucketName --region $Region --create-bucket-configuration "LocationConstraint=$Region" | Out-Null
  }
}

function Get-PythonSolutionStack {
  $response = Invoke-AwsJson @("elasticbeanstalk", "list-available-solution-stacks", "--region", $Region, "--output", "json")
  $stack = $response.SolutionStacks |
    Where-Object { $_ -like "*Python 3.12*Amazon Linux 2023*" } |
    Select-Object -Last 1
  if (-not $stack) {
    $stack = $response.SolutionStacks |
      Where-Object { $_ -like "*Python 3.11*Amazon Linux 2023*" } |
      Select-Object -Last 1
  }
  if (-not $stack) {
    throw "Elastic Beanstalk Python 3.11/3.12 Amazon Linux 2023 platformu bulunamadı."
  }
  return $stack
}

function Get-Environment {
  $response = Invoke-AwsJson @(
    "elasticbeanstalk",
    "describe-environments",
    "--application-name", $AppName,
    "--environment-names", $EnvName,
    "--region", $Region,
    "--output", "json"
  )
  return $response.Environments | Where-Object { $_.Status -ne "Terminated" } | Select-Object -First 1
}

function Wait-EnvironmentReady {
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 10
    $env = Get-Environment
    if ($env -and $env.Status -eq "Ready") {
      return $env
    }
    Write-Host "Elastic Beanstalk hazırlanıyor... $($env.Status)"
  }
  throw "Elastic Beanstalk ortamı zamanında Ready olmadı."
}

$script:AwsPath = Resolve-AwsCli
$identity = Ensure-AwsIdentity
$accountId = $identity.Account
$bucketName = "fora-cmp-eb-$accountId-$Region"
$versionLabel = "fora-cmp-api-$(Get-Date -Format 'yyyyMMddHHmmss')"
$bundlePath = New-BackendBundle
$s3Key = "backend/$versionLabel.zip"
$randomBytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($randomBytes)
$jwtSecret = [Convert]::ToBase64String($randomBytes)

Write-Host "AWS Account: $accountId"
Write-Host "Region: $Region"
Write-Host "Bundle: $bundlePath"

Ensure-Bucket $bucketName
& $AwsPath s3 cp $bundlePath "s3://$bucketName/$s3Key" --region $Region | Out-Null

$apps = Invoke-AwsJson @("elasticbeanstalk", "describe-applications", "--application-names", $AppName, "--region", $Region, "--output", "json")
if (-not $apps.Applications) {
  & $AwsPath elasticbeanstalk create-application --application-name $AppName --region $Region | Out-Null
}

& $AwsPath elasticbeanstalk create-application-version `
  --application-name $AppName `
  --version-label $versionLabel `
  --source-bundle "S3Bucket=$bucketName,S3Key=$s3Key" `
  --region $Region | Out-Null

$optionsPath = Join-Path $artifactsRoot "eb-options-$versionLabel.json"
$options = @(
  @{ Namespace = "aws:elasticbeanstalk:environment"; OptionName = "EnvironmentType"; Value = "SingleInstance" },
  @{ Namespace = "aws:elasticbeanstalk:application:environment"; OptionName = "FLASK_ENV"; Value = "production" },
  @{ Namespace = "aws:elasticbeanstalk:application:environment"; OptionName = "FRONTEND_ORIGIN"; Value = $FrontendOrigin },
  @{ Namespace = "aws:elasticbeanstalk:application:environment"; OptionName = "DATABASE_URL"; Value = $DatabaseUrl },
  @{ Namespace = "aws:elasticbeanstalk:application:environment"; OptionName = "JWT_SECRET_KEY"; Value = $jwtSecret },
  @{ Namespace = "aws:elasticbeanstalk:application:environment"; OptionName = "AUTO_CREATE_DB"; Value = "true" },
  @{ Namespace = "aws:elasticbeanstalk:application:environment"; OptionName = "DEFAULT_TENANT_ID"; Value = "fora" },
  @{ Namespace = "aws:elasticbeanstalk:application:environment"; OptionName = "PORT"; Value = "8000" }
)
$options | ConvertTo-Json -Depth 4 | Set-Content -Path $optionsPath -Encoding utf8

$environment = Get-Environment
if ($environment) {
  & $AwsPath elasticbeanstalk update-environment `
    --application-name $AppName `
    --environment-name $EnvName `
    --version-label $versionLabel `
    --option-settings "file://$optionsPath" `
    --region $Region | Out-Null
} else {
  $stack = Get-PythonSolutionStack
  & $AwsPath elasticbeanstalk create-environment `
    --application-name $AppName `
    --environment-name $EnvName `
    --solution-stack-name $stack `
    --version-label $versionLabel `
    --option-settings "file://$optionsPath" `
    --region $Region | Out-Null
}

$readyEnvironment = Wait-EnvironmentReady
$apiUrl = "https://$($readyEnvironment.CNAME)/api"

Write-Host "Backend API: $apiUrl"

if (-not $SkipAmplifyUpdate) {
  & $AwsPath amplify update-branch `
    --app-id $AmplifyAppId `
    --branch-name $AmplifyBranch `
    --environment-variables "VITE_API_URL=$apiUrl" `
    --region $Region | Out-Null
  & $AwsPath amplify start-job `
    --app-id $AmplifyAppId `
    --branch-name $AmplifyBranch `
    --job-type RELEASE `
    --region $Region | Out-Null
  Write-Host "Amplify VITE_API_URL güncellendi ve release job başlatıldı."
}

Write-Host "Tamamlandı."
