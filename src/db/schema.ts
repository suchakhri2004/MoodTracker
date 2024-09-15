import { pool } from './client';

const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
        office365_id VARCHAR(100) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        faculty VARCHAR(100),
        department VARCHAR(100),
        role TEXT,
        year TEXT,
        accesstoken TEXT,
        createdAt DATE DEFAULT CURRENT_DATE,
        updatedAt DATE DEFAULT CURRENT_DATE
    );
`;

const createMoodtrackerTable = `
    CREATE TABLE IF NOT EXISTS moodtracker (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mood VARCHAR(50) CHECK (mood IN ('VERY_HAPPY', 'HAPPY', 'NORMAL', 'SAD', 'VERY_SAD')),
        content TEXT,
        user_id VARCHAR(100) REFERENCES users(office365_id),
        createdAt DATE DEFAULT CURRENT_DATE
    );
`;

const createWordCloudTable = `
CREATE TABLE IF NOT EXISTS wordcloud (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        word TEXT,
        count INTEGER DEFAULT 1,
        createdAt DATE DEFAULT CURRENT_DATE
);
`


const createTables = async () => {
    try {
        await pool.query(createUsersTable);
        await pool.query(createMoodtrackerTable);
        await pool.query(createWordCloudTable);

        console.log("Tables created successfully!");
    } catch (error) {
        console.error("Error creating tables:", error);
    }
};

createTables();
