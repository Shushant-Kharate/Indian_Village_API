import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import os

print("Starting database import to NeonDB...")

# Connect to NeonDB
try:
    conn = psycopg2.connect(
        os.environ.get("DATABASE_URL") or 
        "postgresql://neondb_owner:npg_H4xktPAdmSI6@ep-bold-bread-amxq3u4e.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
    )
    print("✓ Connected to NeonDB")
except Exception as e:
    print(f"✗ Connection failed: {e}")
    exit(1)

cur = conn.cursor()

# Load CSVs (same folder, so no path needed)
states = pd.read_csv("clean_states.csv")
districts = pd.read_csv("clean_districts.csv")
subdistricts = pd.read_csv("clean_subdistricts.csv")
villages = pd.read_csv("clean_villages.csv")
execute_values(cur,
    "INSERT INTO states (state_code, state_name) VALUES %s ON CONFLICT DO NOTHING",
    list(states.itertuples(index=False, name=None))
)
print("✓ States inserted:", len(states))

# Insert Districts
execute_values(cur,
    "INSERT INTO districts (district_code, district_name, state_code) VALUES %s ON CONFLICT DO NOTHING",
    list(districts.itertuples(index=False, name=None))
)
print("✓ Districts inserted:", len(districts))

# Insert Subdistricts
execute_values(cur,
    "INSERT INTO subdistricts (subdistrict_code, subdistrict_name, district_code) VALUES %s ON CONFLICT DO NOTHING",
    list(subdistricts.itertuples(index=False, name=None))
)
print("✓ Subdistricts inserted:", len(subdistricts))

# Insert Villages
print("Inserting villages... please wait")
execute_values(cur,
    "INSERT INTO villages (village_code, village_name, subdistrict_code) VALUES %s ON CONFLICT DO NOTHING",
    list(villages.itertuples(index=False, name=None)),
    page_size=5000
)
print("✓ Villages inserted:", len(villages))

# Commit & close
conn.commit()
cur.close()
conn.close()

print("\n✅ Data successfully imported!")