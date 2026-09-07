import psycopg

connection = psycopg.connect(
    host="localhost",
    port=5432,
    dbname="railway_block_planning",
    user="postgres",
    password="Sansi2305"
)

cursor = connection.cursor()

cursor.execute("""
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
""")

tables = cursor.fetchall()

print("\nTables in railway_block_planning:\n")

for table in tables:
    print(table[0])

cursor.close()
connection.close()