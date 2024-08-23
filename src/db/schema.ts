import { pool } from './client';

const createRolesTable = `
    CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role_name VARCHAR(50) CHECK (role_name IN ('ADMIN', 'USER'))
    );
`;

const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        office365_id VARCHAR(100),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        role_id UUID REFERENCES roles(id),
        user_group VARCHAR(100),
        branch VARCHAR(100),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`;


const createUserToUserTable = `
    CREATE TABLE IF NOT EXISTS user_to_user (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        teacher UUID REFERENCES users(id),
        student UUID REFERENCES users(id)
    );
`;

const createSessionTable = `
    CREATE TABLE IF NOT EXISTS session (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        logout_time TIMESTAMP
    );
`;

const createMoodtrackerTable = `
    CREATE TABLE IF NOT EXISTS moodtracker (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mood VARCHAR(50) CHECK (mood IN ('VERY_HAPPY', 'HAPPY', 'NORMAL', 'SAD', 'VERY_SAD')),
        content TEXT,
        user_id UUID REFERENCES users(id),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`;

const createWordcloundTable = `
    CREATE TABLE IF NOT EXISTS wordcloud (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        word VARCHAR(255) UNIQUE NOT NULL,
        count INT DEFAULT 0,
        date DATE DEFAULT CURRENT_DATE
    );
`;

const createTables = async () => {
    try {
        // Create tables in the correct order
        await pool.query(createRolesTable);
        await pool.query(createUsersTable);
        await pool.query(createUserToUserTable);
        await pool.query(createSessionTable);
        await pool.query(createMoodtrackerTable);
        await pool.query(createWordcloundTable);

        console.log("Tables created successfully!");
    } catch (error) {
        console.error("Error creating tables:", error);
    }
};

createTables();
