from datetime import datetime
import zoneinfo
for tz_name in ['UTC', 'Asia/Dhaka']:
    tz = zoneinfo.ZoneInfo(tz_name)
    today = datetime.now(tz).strftime('%m.%d.%Y')
    print(f'{tz_name}: {today}')
