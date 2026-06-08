$data = Invoke-WebRequest -Uri 'http://127.0.0.1:4040/api/tunnels' -UseBasicParsing
$json = $data.Content | ConvertFrom-Json
Write-Host "Total tunnels: $($json.tunnels.Count)"
$json.tunnels | ForEach-Object {
    Write-Host "Name: $($_.name), Public: $($_.public_url)"
}
