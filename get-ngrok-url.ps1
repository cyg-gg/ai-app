$data = Invoke-WebRequest -Uri 'http://127.0.0.1:4040/api/tunnels' -UseBasicParsing
$json = $data.Content | ConvertFrom-Json
$json.tunnels | ForEach-Object {
    Write-Host "[$($_.name)] $($_.public_url)"
}
