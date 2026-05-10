$env:PATH = $env:PATH + ";C:\Program Files\nodejs"
Set-Location D:\Development\inshort
& "D:\Development\inshort\node_modules\.bin\next.cmd" dev -p 3005 2>&1 | Out-File -FilePath D:\Development\inshort\dev.log -Encoding utf8
