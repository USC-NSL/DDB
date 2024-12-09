import pandas as pd
import matplotlib.pyplot as plt
from pprint import pprint
import pylustrator
import glob

LOG_PATH = "../logs/overhead/"
NU_SOCIALNET_LOG_PATH = LOG_PATH + "nu_socialnet/"

# files = glob.glob(NU_SOCIALNET_LOG_PATH + "DDB_DISABLE.*")
# pprint(files)

data = []

def extract_data(match: str, embed: bool, debugger: str):
    # from 1 server to 7 servers setup
    for i in range(1, 8):
        files = glob.glob(NU_SOCIALNET_LOG_PATH + f"{match}.{i}.*")
        mops = 0
        avg_lat_sum = 0
        lat_p50_sum = 0
        lat_p90_sum = 0
        lat_p95_sum = 0
        lat_p99_sum = 0
        for file in files:
            with open(file, 'r') as f:
                lines = f.readlines()
                if lines:
                    # print(lines[-1].strip())
                    line_d = lines[-1].strip().split()
                    mops += float(line_d[0])
                    avg_lat_sum += int(line_d[1])
                    lat_p50_sum += int(line_d[2])
                    lat_p90_sum += int(line_d[3])
                    lat_p95_sum += int(line_d[4])
                    lat_p99_sum += int(line_d[5])
        avg_lat = avg_lat_sum / len(files)
        lat_p50 = lat_p50_sum / len(files)
        lat_p90 = lat_p90_sum / len(files)
        lat_p95 = lat_p95_sum / len(files)
        lat_p99 = lat_p99_sum / len(files)
        # print(f"i: {i}, mops: {mops}")
        data.append(
            {
                "servers": i,
                "mops": mops,
                "avg_lat": avg_lat,
                "lat_p50": lat_p50,
                "lat_p90": lat_p90,
                "lat_p95": lat_p95,
                "lat_p99": lat_p99,
                "embed": embed,
                "debugger": debugger
            }
        )

extract_data("DDB_DISABLE", False, "none")
extract_data("DDB_ENABLE", True, "none")
extract_data("gdb.DDB_DISABLE", False, "gdb")
extract_data("ddb.DDB_ENABLE", True, "ddb")

df = pd.DataFrame(data)
df.head()

pylustrator.start()

# plt.style.use('fivethirtyeight')
plt.style.use('default')
plt.figure(figsize=(12, 6))
# plt.figure(figsize=(12, 6))

# Plot for embed == False and debugger == "none"
filtered_df = df.query('embed == False and debugger == "none"')
plt.plot(filtered_df['servers'], filtered_df['mops'], label='No Embed, No Debugger', marker='o')
# plt.scatter(filtered_df['servers'], filtered_df['mops'], marker='o')

# Plot for embed == True and debugger == "none"
filtered_df = df.query('embed == True and debugger == "none"')
plt.plot(filtered_df['servers'], filtered_df['mops'], label='Embed, No Debugger', marker='s')
# plt.scatter(filtered_df['servers'], filtered_df['mops'], marker='s')

filtered_df = df.query('embed == False and debugger == "gdb"')
plt.plot(filtered_df['servers'], filtered_df['mops'], label='Embed, GDB Debugger', marker='^')

filtered_df = df.query('embed == True and debugger == "ddb"')
plt.plot(filtered_df['servers'], filtered_df['mops'], label='Embed, DDB Debugger', marker='^')


plt.xlabel('Number of Servers')
plt.ylabel('MOPS')
plt.title('MOPS vs Number of Servers')
plt.legend()
plt.grid(True)
plt.show()