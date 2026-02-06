#1 Tải k6 bằng terminal chạy quyền admin
cd desktop hoặc folder download

Invoke-WebRequest -Uri "https://github.com/grafana/k6/releases/download/v1.5.0/k6-v1.5.0-windows-amd64.msi" -OutFile "k6_install.msi"

Start-Process msiexec.exe -ArgumentList "/i k6_install.msi /quiet /qn" -Wait

#2 Tải script test trên đồ án
#3 Mở terminal,cmd, pơ tại folder chứa script 
#4 k6 run -e K6_BROWSER_HEADLESS=false --out csv=raw.csv start-chal3.js; Import-Csv raw.csv | ?{$_.metric_name -like 'thoi_gian_*'} | Select metric_name, metric_value, @{N='User';E={$_.extra_tags -split 'user=' | select -last 1}} | Export-Csv "ket_qua.csv" -NoType; rm raw.csv;
