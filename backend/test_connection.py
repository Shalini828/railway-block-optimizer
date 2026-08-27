import psycopg

connection = psycopg.connect(
    host="localhost",
    port=5432,
    dbname="railway_block_planning",
    user="postgres",
    password="Sansi2305"
)

print("Connected to PostgreSQL successfully!")

connection.close()