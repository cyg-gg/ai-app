# 停止所有 ngrok 进程
taskkill /F /IM ngrok.exe 2>$null
Start-Sleep -Seconds 2

# 启动单个隧道（同时服务前后端）
Write-Host "=== 启动 ngrok 隧道 ===" -ForegroundColor Green
Start-Process ngrok.exe -ArgumentList "http", "3000" -WindowStyle Normal

Start-Sleep -Seconds 5

# 显示隧道状态
Write-Host "=== 隧道状态 ===" -ForegroundColor Cyan
$json = (Invoke-WebRequest -Uri 'http://127.0.0.1:4040/api/tunnels' -UseBasicParsing).Content
$tunnels = $json | ConvertFrom-Json
$tunnels.tunnels | ForEach-Object {
    Write-Host "  名称: $($_.name)"
    Write-Host "  公网地址: $($_.public_url)"
    Write-Host ""
}

Write-Host "=== 完成 ===" -ForegroundColor Green
Write-Host "  访问前端: https://posh-pureblood-harbor.ngrok-free.dev" -ForegroundColor Yellow
Write-Host "  访问 API:  https://posh-pureblood-harbor.ngrok-free.dev/api/*" -ForegroundColor Yellow
